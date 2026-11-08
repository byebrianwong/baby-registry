import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authenticateExtension, isRegistryManager, jsonError, readJson } from "@/lib/extension-server";
import {
  isUuid,
  MAX_ITEMS_PER_REQUEST,
  parseStoreItem,
  type AddResponse,
  type UndoResponse,
} from "@/lib/extension";
import { storeItemKey } from "@/lib/retailers";

// Undo only removes items the extension could just have added: no gifts
// against them yet, and added in the last day.
const UNDO_WINDOW_MS = 24 * 60 * 60 * 1000;

// POST { registryId, items } → adds the items that aren't on the registry yet.
export async function POST(request: Request) {
  const auth = await authenticateExtension(request);
  if (auth.response) return auth.response;
  const { user, supabase } = auth;

  const body = await readJson(request);
  const registryId = body?.registryId;
  const rawItems = body?.items;
  if (!isUuid(registryId) || !Array.isArray(rawItems) || rawItems.length > MAX_ITEMS_PER_REQUEST) {
    return jsonError("Invalid request", 400);
  }
  if (!(await isRegistryManager(user.id, registryId))) {
    return jsonError("You don't manage that registry.", 403);
  }

  const { data: existingItems, error: readError } = await supabase
    .from("registry_items")
    .select("external_url")
    .eq("registry_id", registryId);
  if (readError) return jsonError("Couldn't read the registry.", 500);

  const taken = new Set<string>();
  for (const item of existingItems ?? []) {
    const key = storeItemKey(item.external_url as string | null);
    if (key) taken.add(key);
  }

  // Skip invalid items, items already on the registry, and repeats in this request.
  const toAdd: NonNullable<ReturnType<typeof parseStoreItem>>[] = [];
  let skipped = 0;
  for (const raw of rawItems) {
    const item = parseStoreItem(raw);
    if (!item) continue;
    if (taken.has(item.key)) {
      skipped++;
      continue;
    }
    taken.add(item.key);
    toAdd.push(item);
  }

  if (toAdd.length === 0) {
    const empty: AddResponse = { added: [], skipped };
    return NextResponse.json(empty);
  }

  const { data: inserted, error } = await supabase
    .from("registry_items")
    .insert(
      toAdd.map((item) => ({
        registry_id: registryId,
        title: item.title,
        external_url: item.url,
        image_url: item.imageUrl,
        price: item.price,
        quantity_needed: item.quantity,
        quantity_fulfilled: 0,
      }))
    )
    .select("id, title, external_url");
  if (error) return jsonError("Couldn't add the items.", 500);

  revalidatePath(`/dashboard/registry/${registryId}`);
  const response: AddResponse = {
    added: (inserted ?? []).map((row) => ({
      id: row.id as string,
      title: row.title as string,
      key: storeItemKey(row.external_url as string) ?? "",
    })),
    skipped,
  };
  return NextResponse.json(response);
}

// DELETE { registryId, itemIds } → undoes an automatic import.
export async function DELETE(request: Request) {
  const auth = await authenticateExtension(request);
  if (auth.response) return auth.response;
  const { user, supabase } = auth;

  const body = await readJson(request);
  const registryId = body?.registryId;
  const itemIds = body?.itemIds;
  if (
    !isUuid(registryId) ||
    !Array.isArray(itemIds) ||
    itemIds.length === 0 ||
    itemIds.length > MAX_ITEMS_PER_REQUEST ||
    !itemIds.every(isUuid)
  ) {
    return jsonError("Invalid request", 400);
  }
  if (!(await isRegistryManager(user.id, registryId))) {
    return jsonError("You don't manage that registry.", 403);
  }

  const { data: removed, error } = await supabase
    .from("registry_items")
    .delete()
    .eq("registry_id", registryId)
    .in("id", itemIds)
    .eq("quantity_fulfilled", 0)
    .gte("created_at", new Date(Date.now() - UNDO_WINDOW_MS).toISOString())
    .select("id");
  if (error) return jsonError("Couldn't remove the items.", 500);

  revalidatePath(`/dashboard/registry/${registryId}`);
  const response: UndoResponse = { removed: removed?.length ?? 0 };
  return NextResponse.json(response);
}
