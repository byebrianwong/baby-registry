import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { authenticateExtension, isRegistryManager, jsonError, readJson } from "@/lib/extension-server";
import { isUuid, itemMatchKey, parseProductItem, type AddProductResponse } from "@/lib/extension";

// POST { registryId, item } → adds one item from a product page, with the
// add-item dialog's fields. An item already on the registry comes back as
// `duplicate` instead of being added twice.
export async function POST(request: Request) {
  const auth = await authenticateExtension(request);
  if (auth.response) return auth.response;
  const { user, supabase } = auth;

  const body = await readJson(request);
  const registryId = body?.registryId;
  const item = parseProductItem(body?.item);
  if (!isUuid(registryId)) return jsonError("Invalid request", 400);
  if (!item) return jsonError("The item needs a name and a link.", 400);
  if (!(await isRegistryManager(user.id, registryId))) {
    return jsonError("You don't manage that registry.", 403);
  }

  const [{ data: existingItems, error: readError }, category] = await Promise.all([
    supabase.from("registry_items").select("id, title, external_url").eq("registry_id", registryId),
    // The category has to belong to this registry, not just any registry the user manages.
    item.categoryId
      ? supabase.from("categories").select("id").eq("id", item.categoryId).eq("registry_id", registryId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (readError) return jsonError("Couldn't read the registry.", 500);
  if (item.categoryId && !category.data) return jsonError("That category isn't on this registry.", 400);

  const duplicate = (existingItems ?? []).find((row) => itemMatchKey(row.external_url as string | null) === item.key);
  if (duplicate) {
    const response: AddProductResponse = { duplicate: { id: duplicate.id as string, title: duplicate.title as string } };
    return NextResponse.json(response);
  }

  const { data: inserted, error } = await supabase
    .from("registry_items")
    .insert({
      registry_id: registryId,
      category_id: item.categoryId,
      title: item.title,
      external_url: item.url,
      image_url: item.imageUrl,
      price: item.price,
      quantity_needed: item.quantity,
      quantity_fulfilled: 0,
      is_essential: item.isEssential,
      is_open_to_used: item.isOpenToUsed,
      minimum_condition: item.minimumCondition,
      notes: item.notes,
    })
    .select("id, title")
    .single();
  if (error || !inserted) return jsonError("Couldn't add the item.", 500);

  revalidatePath(`/dashboard/registry/${registryId}`);
  const response: AddProductResponse = { added: { id: inserted.id as string, title: inserted.title as string } };
  return NextResponse.json(response);
}
