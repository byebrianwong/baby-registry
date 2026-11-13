import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Taking an item off one of the lists it's on (see src/lib/list-items.ts). The
// service-role client does the work, so callers check first that the person
// may change that list and that the item is on it. Server code only.

export type RemoveResult = { error: string } | { removed: "placement" | "moved" | "deleted" };

/**
 * Takes an item off one list.
 * - On a list it was placed on, only the placement goes.
 * - On its home list, its home moves to the next list it's on, with its
 *   category there. Its gifts go with it.
 * - On no other list, it's deleted.
 */
export async function removeItemFromList(itemId: string, registryId: string): Promise<RemoveResult> {
  const { data: item, error: readError } = await supabaseAdmin
    .from("registry_items")
    .select("id, registry_id")
    .eq("id", itemId)
    .maybeSingle();
  if (readError) return { error: readError.message };
  if (!item) return { error: "That item isn't there anymore." };

  if (item.registry_id !== registryId) {
    const { error } = await supabaseAdmin
      .from("registry_item_placements")
      .delete()
      .eq("item_id", itemId)
      .eq("registry_id", registryId);
    return error ? { error: error.message } : { removed: "placement" };
  }

  const { data: next, error: nextError } = await supabaseAdmin
    .from("registry_item_placements")
    .select("registry_id, category_id")
    .eq("item_id", itemId)
    .neq("registry_id", registryId)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  // Before the placements table exists, every item is on one list only.
  if (nextError && nextError.code !== "42P01" && nextError.code !== "PGRST205") {
    return { error: nextError.message };
  }

  if (next) {
    const { error } = await supabaseAdmin
      .from("registry_items")
      .update({ registry_id: next.registry_id, category_id: next.category_id })
      .eq("id", itemId)
      // Only if nobody moved it in the meantime.
      .eq("registry_id", registryId);
    if (error) return { error: error.message };
    await supabaseAdmin
      .from("registry_item_placements")
      .delete()
      .eq("item_id", itemId)
      .eq("registry_id", next.registry_id);
    return { removed: "moved" };
  }

  const { error } = await supabaseAdmin.from("registry_items").delete().eq("id", itemId);
  return error ? { error: error.message } : { removed: "deleted" };
}

/** Refreshes the pages of these lists, and the Saved tab. */
export function revalidateLists(registryIds: Iterable<string>, slugs: Iterable<string> = []) {
  for (const id of new Set(registryIds)) revalidatePath(`/dashboard/registry/${id}`);
  for (const slug of new Set(slugs)) revalidatePath(`/r/${slug}`);
  revalidatePath("/dashboard/saved");
  revalidatePath("/dashboard");
}
