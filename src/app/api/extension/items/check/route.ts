import { NextResponse } from "next/server";
import { authenticateExtension, isRegistryManager, jsonError, readJson } from "@/lib/extension-server";
import { isUuid, itemMatchKey, MAX_ITEMS_PER_REQUEST, type CheckResponse } from "@/lib/extension";

// POST { registryId, urls } → which of those items are already on the
// registry. At stores we know, items match on the product ID inside each
// link, so a plain link already on Regibee counts as the same item.
export async function POST(request: Request) {
  const auth = await authenticateExtension(request);
  if (auth.response) return auth.response;
  const { user, supabase } = auth;

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

  const { data: items, error } = await supabase
    .from("registry_items")
    .select("external_url")
    .eq("registry_id", registryId);
  if (error) return jsonError("Couldn't read the registry.", 500);

  const existing = new Set<string>();
  for (const item of items ?? []) {
    const key = itemMatchKey(item.external_url as string | null);
    if (key && wanted.has(key)) existing.add(key);
  }

  const response: CheckResponse = { existing: [...existing] };
  return NextResponse.json(response);
}
