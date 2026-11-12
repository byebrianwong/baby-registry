import { NextResponse } from "next/server";
import { authenticateExtension, isRegistryManager, jsonError, readJson } from "@/lib/extension-server";
import { isUuid, itemMatchKey, MAX_ITEMS_PER_REQUEST, type CheckResponse } from "@/lib/extension";
import { classifyStoreLink } from "@/lib/retailers";
import { LINK_COLUMNS, loadListItems, type LinkRow } from "@/lib/list-items";

// POST { registryId, urls } → which of those items are already on the
// registry, and which of those have only a plain store link. At stores we
// know, items match on the product ID inside each link, so a plain link
// already on Regibee counts as the same item.
export async function POST(request: Request) {
  const auth = await authenticateExtension(request);
  if (auth.response) return auth.response;
  const { user } = auth;

  const body = await readJson(request);
  const registryId = body?.registryId;
  const urls = body?.urls;
  if (!isUuid(registryId) || !Array.isArray(urls) || urls.length > MAX_ITEMS_PER_REQUEST) {
    return jsonError("Invalid request", 400);
  }
  if (!(await isRegistryManager(user.id, registryId))) {
    return jsonError("You don't manage that registry.", 403);
  }

  const wanted = new Set(urls.map((u) => (typeof u === "string" ? itemMatchKey(u) : null)).filter(Boolean));

  // Items placed on this list from the owner's other lists count too
  // (src/lib/list-items.ts). The manager check above has passed.
  let items: { external_url: string | null }[];
  try {
    items = await loadListItems<LinkRow>(registryId, LINK_COLUMNS);
  } catch {
    return jsonError("Couldn't read the registry.", 500);
  }

  const existing = new Set<string>();
  const plain = new Set<string>();
  for (const item of items ?? []) {
    const url = item.external_url as string | null;
    const key = itemMatchKey(url);
    if (!key || !wanted.has(key)) continue;
    existing.add(key);
    if (classifyStoreLink(url)?.kind === "plain") plain.add(key);
  }

  const response: CheckResponse = { existing: [...existing], plain: [...plain] };
  return NextResponse.json(response);
}
