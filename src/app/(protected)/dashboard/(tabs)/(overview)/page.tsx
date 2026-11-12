import Link from "next/link";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { Link2, Plus, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardRegistryCard } from "@/components/dashboard-registry-card";
import { PandaMark } from "@/components/panda-mark";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { countFollowRequests } from "@/lib/follows";
import { getSessionUser } from "@/lib/viewer";
import { giverNameForOwner, itemAsUnreserved, reservationsHiddenFrom } from "@/lib/gifts";
import { itemsHiddenFromOwner, loadPlacements } from "@/lib/list-items";

type CardPurchase = { id: string; status: string; created_at: string; buyer_name: string; hide_giver?: boolean | null };
type CardItem = {
  id: string;
  quantity_needed: number;
  quantity_fulfilled: number;
  is_parent_purchased: boolean;
  price: number | null;
  purchases: CardPurchase[] | null;
};

// Purchases that still count: everything except cancelled reservations.
function activePurchases(registry: any): CardPurchase[] {
  return ((registry.registry_items as CardItem[] | null) || [])
    .flatMap((item) => item.purchases || [])
    .filter((p) => p.status !== "cancelled");
}

function RegistryCard({
  registry,
  viewerId,
  today,
  hiddenItemIds,
  badge,
  headingLevel,
}: {
  registry: any;
  viewerId: string;
  today: string;
  /** Items whose gifts another of the owner's lists hides from them. */
  hiddenItemIds: Set<string>;
  badge?: string;
  headingLevel?: 2 | 3;
}) {
  // An owner who hides what's been reserved sees nothing reserved yet.
  const hidden = reservationsHiddenFrom(registry, viewerId);
  const allItems = (registry.registry_items as CardItem[] | null) || [];
  const items: CardItem[] = allItems.map((item) =>
    hidden || hiddenItemIds.has(item.id) ? itemAsUnreserved(item) : item
  );
  const recentPurchases = (
    hidden ? [] : activePurchases({ registry_items: allItems.filter((item) => !hiddenItemIds.has(item.id)) })
  )
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 3);

  return (
    <DashboardRegistryCard
      title={registry.title}
      registryType={registry.registry_type || "baby"}
      eventType={registry.event_type ?? null}
      eventDate={registry.event_date ?? null}
      today={today}
      totalItems={items.length}
      fulfilledItems={items.filter((item) => item.quantity_fulfilled >= item.quantity_needed).length}
      totalValue={items.reduce((sum, item) => sum + (item.price || 0), 0)}
      recentActivity={recentPurchases.map((p) => ({ id: p.id, name: giverNameForOwner(p), action: "reserved an item" }))}
      manageHref={`/dashboard/registry/${registry.id}`}
      publicHref={`/r/${registry.slug}`}
      reservationsHidden={hidden}
      badge={badge}
      headingLevel={headingLevel}
    />
  );
}

type ServerClient = Awaited<ReturnType<typeof createClient>>;

const CARD_ITEM_FIELDS =
  "id, quantity_needed, quantity_fulfilled, is_parent_purchased, price, purchases(id, status, created_at, buyer_name, hide_giver)";

/**
 * Adds the items placed on each list from its owner's other lists
 * (src/lib/list-items.ts), so the cards count every item on the list. Also
 * returns the items whose gifts are hidden from this person because another
 * list they're on hides what's been reserved from its owner.
 */
async function withPlacedItems(registries: any[], viewerId: string): Promise<Set<string>> {
  const placements = await loadPlacements(registries.map((r) => r.id as string)).catch(() => []);
  if (placements.length === 0) return new Set();

  const ids = [...new Set(placements.map((p) => p.item_id))];
  const [{ data: placedItems }, hiddenItemIds] = await Promise.all([
    supabaseAdmin.from("registry_items").select(`registry_id, ${CARD_ITEM_FIELDS}`).in("id", ids),
    itemsHiddenFromOwner(ids, viewerId).catch(() => new Set<string>()),
  ]);
  const byId = new Map((placedItems ?? []).map((item: any) => [item.id as string, item]));
  const byList = new Map(registries.map((r) => [r.id as string, r]));
  for (const p of placements) {
    const registry = byList.get(p.registry_id);
    const item = byId.get(p.item_id);
    if (!registry || !item || item.registry_id === p.registry_id) continue;
    registry.registry_items = [...(registry.registry_items ?? []), item];
  }
  return hiddenItemIds;
}

// What each registry card needs: the registry, its items, and their purchases.
const REGISTRY_CARD_FIELDS = `
  *,
  registry_items(${CARD_ITEM_FIELDS})
`;

// Registries the user helps manage but doesn't own. Pending email invites are
// accepted first, so a registry from a new invite shows up on this visit.
async function loadSharedRegistries(supabase: ServerClient, user: User) {
  if (user.email) {
    const { data: pendingInvites } = await supabaseAdmin
      .from("registry_invites")
      .select("token")
      .eq("email", user.email)
      .gt("expires_at", new Date().toISOString());

    // With the user's own session: the function adds auth.uid() and ignores
    // p_user_id, so the service-role client would add nobody.
    for (const invite of pendingInvites || []) {
      await supabase.rpc("accept_registry_invite", {
        p_token: invite.token,
        p_user_id: user.id,
      });
      // Errors (already a manager, fully used, etc.) are ignored
    }
  }

  const { data: managedEntries } = await supabaseAdmin
    .from("registry_managers")
    .select("registry_id")
    .eq("user_id", user.id)
    .eq("role", "manager");

  const managedRegistryIds = (managedEntries || []).map((e) => e.registry_id);
  if (managedRegistryIds.length === 0) return [];

  const { data } = await supabase
    .from("registries")
    .select(REGISTRY_CARD_FIELDS)
    .in("id", managedRegistryIds)
    .order("created_at", { ascending: false });
  return data || [];
}


export default async function DashboardPage() {
  // The top bar and the tabs look up the same user, and the lookup is cached
  // per request.
  const [supabase, user] = await Promise.all([createClient(), getSessionUser()]);

  if (!user) {
    redirect("/login");
  }

  // None of these three needs another's result, so they run at the same time.
  // The page waits for the slowest one, not for all of them in a row.
  const [{ data: registries }, sharedRegistries, followRequestCount] =
    await Promise.all([
      supabase
        .from("registries")
        .select(REGISTRY_CARD_FIELDS)
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false }),
      loadSharedRegistries(supabase, user),
      user.is_anonymous ? 0 : countFollowRequests(user.id),
    ]);

  const hiddenItemIds = await withPlacedItems([...(registries || []), ...sharedRegistries], user.id);

  const hasNoRegistries = (!registries || registries.length === 0) && sharedRegistries.length === 0;
  // Until one of their registries is on their profile, the profile link has
  // nothing on it to share.
  const showProfilePrompt =
    !user.is_anonymous &&
    Boolean(registries && registries.length > 0) &&
    !registries!.some((registry) => registry.listed_on_profile);

  // Dates are YYYY-MM-DD in UTC, like the Following tab's (following/page.tsx).
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const weekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
  // An item on several lists counts its gifts once.
  const giftsThisWeek = new Set(
    [...(registries || []), ...sharedRegistries]
      .flatMap((registry) =>
        reservationsHiddenFrom(registry, user.id)
          ? []
          : activePurchases({
              registry_items: ((registry.registry_items as CardItem[] | null) || []).filter(
                (item) => !hiddenItemIds.has(item.id),
              ),
            }),
      )
      .filter((p) => Date.parse(p.created_at) >= weekAgo)
      .map((p) => p.id),
  ).size;

  return (
    <div className="container mx-auto px-4 pt-6 pb-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          {/* The My registries tab is the visible title (see (tabs)/layout.tsx). */}
          <h1 className="sr-only">My Registries</h1>
          {giftsThisWeek > 0 ? (
            <p className="flex items-start gap-2 text-tertiary">
              <span aria-hidden="true" className="mt-2 size-2 shrink-0 rounded-full bg-mint-500" />
              {giftsThisWeek === 1 ? "1 gift reserved this week" : `${giftsThisWeek} gifts reserved this week`}
            </p>
          ) : (
            <p className="text-tertiary">Manage your registries and track gifts</p>
          )}
        </div>
        <Button asChild>
          <Link href="/dashboard/new">
            <span className="inline-flex items-center gap-1.5">
              <Plus className="h-4 w-4 shrink-0" />
              New
            </span>
          </Link>
        </Button>
      </div>

      {followRequestCount > 0 && (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-blush-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary">
              <UserPlus aria-hidden="true" className="h-4.5 w-4.5 text-blush-700" />
            </span>
            <div>
              <p className="font-medium">
                {followRequestCount === 1
                  ? "1 person wants to follow you"
                  : `${followRequestCount} people want to follow you`}
              </p>
              <p className="text-sm text-tertiary">
                People you approve can see the private registries on your profile.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="shrink-0" asChild>
            <Link href="/dashboard/account#follows">Review requests</Link>
          </Button>
        </div>
      )}

      {showProfilePrompt && (
        <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-brand-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary">
              <Link2 aria-hidden="true" className="h-4.5 w-4.5 text-brand-600" />
            </span>
            <div>
              <p className="font-medium">Give friends one link to all your registries</p>
              <p className="text-sm text-tertiary">
                Your profile shows only the registries you choose. Friends can follow it to see new ones.
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" className="shrink-0" asChild>
            <Link href="/dashboard/account">Choose registries</Link>
          </Button>
        </div>
      )}

      {hasNoRegistries ? (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <PandaMark className="h-20 w-auto" />
            <h2 className="mt-4 text-xl font-semibold">No registries yet</h2>
            <p className="mt-2 text-tertiary">
              Create your first registry to start adding items.
            </p>
            <Button className="mt-6" asChild>
              <Link href="/dashboard/new">
                <span className="inline-flex items-center gap-1.5">
                  <Plus className="h-4 w-4 shrink-0" />
                  Start something new
                </span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {registries && registries.length > 0 && (
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {registries.map((registry) => (
                <RegistryCard key={registry.id} registry={registry} viewerId={user.id} today={today} hiddenItemIds={hiddenItemIds} />
              ))}
            </div>
          )}

          {sharedRegistries.length > 0 && (
            <>
              <div className="mt-10">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Shared with you
                </h2>
                <p className="text-sm text-tertiary mt-1">
                  Registries you&apos;ve been invited to manage
                </p>
              </div>
              <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {sharedRegistries.map((registry) => (
                  <RegistryCard key={registry.id} registry={registry} viewerId={user.id} today={today} hiddenItemIds={hiddenItemIds} badge="Manager" headingLevel={3} />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
