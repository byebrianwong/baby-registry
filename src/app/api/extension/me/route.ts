import { NextResponse } from "next/server";
import { authenticateExtension, managedRegistryIds } from "@/lib/extension-server";
import { parseRetailerRegistries, plainLinksByStore, type StoreId } from "@/lib/retailers";
import type { MeResponse } from "@/lib/extension";
import { LINK_COLUMNS, loadItemsForLists, type LinkRow } from "@/lib/list-items";

// GET → who the extension is signed in as, and the registries they manage.
export async function GET(request: Request) {
  const auth = await authenticateExtension(request);
  if (auth.response) return auth.response;
  const { user, supabase } = auth;

  const ids = await managedRegistryIds(user.id);
  type CategoryRow = { id: string; registry_id: string; name: string };
  type ItemRow = { registry_id: string; external_url: string | null };
  const [{ data: profile }, { data: registries }, { data: categories }, { data: items }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    ids.length > 0
      ? supabase
          .from("registries")
          .select("id, title, settings")
          .in("id", ids)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as { id: string; title: string; settings: unknown }[] }),
    ids.length > 0
      ? supabase
          .from("categories")
          .select("id, registry_id, name")
          .in("registry_id", ids)
          .order("sort_order", { ascending: true })
      : Promise.resolve({ data: [] as CategoryRow[] }),
    // Only the links, to count plain store links. Items placed on a list from
    // the owner's other lists count too (src/lib/list-items.ts).
    loadItemsForLists<LinkRow>(ids, LINK_COLUMNS).then(
      (byList) => ({ data: [...byList.values()].flat() as ItemRow[] }),
      () => ({ data: [] as ItemRow[] }),
    ),
  ]);

  const categoriesByRegistry = new Map<string, { id: string; name: string }[]>();
  for (const c of (categories ?? []) as CategoryRow[]) {
    const list = categoriesByRegistry.get(c.registry_id) ?? [];
    list.push({ id: c.id, name: c.name });
    categoriesByRegistry.set(c.registry_id, list);
  }

  const itemsByRegistry = new Map<string, ItemRow[]>();
  for (const item of (items ?? []) as ItemRow[]) {
    itemsByRegistry.set(item.registry_id, [...(itemsByRegistry.get(item.registry_id) ?? []), item]);
  }
  const plainLinks = (registryId: string, linkedStores: StoreId[]) => {
    const counts: Partial<Record<StoreId, number>> = {};
    for (const [store, list] of plainLinksByStore(itemsByRegistry.get(registryId) ?? [], linkedStores)) {
      counts[store] = list.length;
    }
    return counts;
  };

  const body: MeResponse = {
    user: {
      name: (profile?.full_name as string | null)?.trim() || user.email || "You",
      email: user.email ?? null,
    },
    // Only the linked store registries leave the server. Settings also holds
    // the shipping address and payment details.
    registries: (registries ?? []).map((r) => {
      const storeRegistries = parseRetailerRegistries(r.settings);
      return {
        id: r.id as string,
        title: r.title as string,
        storeRegistries,
        categories: categoriesByRegistry.get(r.id as string) ?? [],
        plainLinks: plainLinks(r.id as string, storeRegistries.map((s) => s.store)),
      };
    }),
  };
  return NextResponse.json(body);
}
