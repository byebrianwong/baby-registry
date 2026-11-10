import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUser } from "@/lib/viewer";
import { findSharedLink } from "@/lib/shared-link";
import { SharePicker, addSharedLinkHref, type ShareRegistry } from "@/components/share-picker";

export const metadata: Metadata = {
  title: "Add to Regibee",
};

type SearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

// Android opens this page when an owner shares a product to an installed
// Regibee (the manifest's share_target, src/app/manifest.ts). It finds the
// product link in what was shared, asks which registry when there's more than
// one, and opens that registry's add item dialog with the link filled in.
export default async function SharePage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const sharedFields = { title: first(params.title), text: first(params.text), url: first(params.url) };

  // The top bar looks up the same user, and the lookup is cached per request.
  const [supabase, user] = await Promise.all([createClient(), getSessionUser()]);

  // Guests who reserved a gift have an anonymous session but no registries.
  // Either way, sign in and come back here with what was shared.
  if (!user || user.is_anonymous) {
    const back = new URLSearchParams();
    for (const [key, value] of Object.entries(sharedFields)) if (value) back.set(key, value);
    redirect(`/login?redirect=${encodeURIComponent(`/share?${back}`)}`);
  }

  const shared = findSharedLink(sharedFields);
  if (!shared) return <SharePicker shared={null} registries={[]} />;

  // Registries they own, then ones they help manage, newest first in each,
  // like the dashboard.
  const fields = "id, title, registry_type, event_type, photo_url, honoree_names";
  const { data: managed } = await supabaseAdmin
    .from("registry_managers")
    .select("registry_id")
    .eq("user_id", user.id)
    .eq("role", "manager");
  const managedIds = (managed || []).map((row) => row.registry_id);
  const [{ data: owned }, { data: sharedWithMe }] = await Promise.all([
    supabase.from("registries").select(fields).eq("owner_id", user.id).order("created_at", { ascending: false }),
    managedIds.length > 0
      ? supabase.from("registries").select(fields).in("id", managedIds).order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const registries: ShareRegistry[] = [...(owned || []), ...(sharedWithMe || [])].map((registry) => ({
    id: registry.id,
    title: registry.title,
    registryType: registry.registry_type || "baby",
    eventType: registry.event_type ?? null,
    photoUrl: registry.photo_url ?? null,
    names: registry.honoree_names || null,
  }));

  if (registries.length === 1) redirect(addSharedLinkHref(registries[0].id, shared));

  return <SharePicker shared={shared} registries={registries} />;
}
