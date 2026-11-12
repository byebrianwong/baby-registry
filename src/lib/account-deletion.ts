// Deleting an account, for DELETE /api/account (src/app/api/account/route.ts).
// Server only: it uses the service-role client, so every query here is
// filtered by the id of the account being deleted.
//
// Deleting the auth user does most of the work. Every table that points at an
// account does so through public.profiles, and every one of those foreign
// keys cascades: profiles, registries and everything on them (items,
// categories, gift funds, guest suggestions, managers, invites), events and
// their guests, follows both ways, blocks both ways, follow invites and the
// rate-limit rows. Supabase deletes the account's sessions too, which signs
// out the website, the app and the browser extension.
//
// This file adds what the foreign keys don't do:
// - Registries other people help manage are handed over first. The
//   co-manager who joined first becomes the owner, so the registry and its
//   guests' gifts stay for them. If the account then can't be deleted, they're
//   handed back.
// - Guests' gift records (purchases) point at items and funds with
//   "on delete set null", so a deleted registry would leave them behind with
//   the guests' names, emails and messages. They're deleted.
// - Uploaded photos and invitation pictures live in Storage, in folders named
//   for each registry and event. Those folders are emptied.

import type { AccountDeletionSummary } from "@/lib/account-deletion-summary";
import { EVENT_IMAGES_BUCKET } from "@/lib/event-images";
import { REGISTRY_PHOTOS_BUCKET } from "@/lib/registry-photos";
import { supabaseAdmin } from "@/lib/supabase-admin";

export interface AccountDeletionPlan {
  userId: string;
  deleted: { id: string; title: string; purchaseIds: string[]; gifts: number }[];
  handedOver: { id: string; title: string; listed: boolean; newOwnerId: string; newOwner: string }[];
  leaving: { id: string; title: string }[];
  eventIds: string[];
}

// Filters with long id lists go in the URL, so they're sent in batches.
const BATCH = 100;

function batches<T>(list: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += BATCH) out.push(list.slice(i, i + BATCH));
  return out;
}

function fail(step: string, error: { message: string } | null): never {
  throw new Error(`Account deletion: ${step}: ${error?.message ?? "unknown error"}`);
}

/** Works out what deleting the account will do, without changing anything. */
export async function planAccountDeletion(userId: string): Promise<AccountDeletionPlan> {
  const [owned, memberships, events] = await Promise.all([
    supabaseAdmin
      .from("registries")
      .select("id, title, listed_on_profile")
      .eq("owner_id", userId)
      .order("created_at"),
    supabaseAdmin.from("registry_managers").select("registry_id").eq("user_id", userId),
    supabaseAdmin.from("events").select("id").eq("owner_id", userId),
  ]);
  if (owned.error) fail("reading registries", owned.error);
  if (memberships.error) fail("reading managers", memberships.error);
  if (events.error) fail("reading events", events.error);

  const ownedRegistries = (owned.data ?? []) as { id: string; title: string; listed_on_profile: boolean }[];
  const ownedIds = ownedRegistries.map((r) => r.id);
  const managedIds = (memberships.data ?? [])
    .map((m) => m.registry_id as string)
    .filter((id) => !ownedIds.includes(id));

  // Everyone else who manages the account's own registries, earliest first.
  const [coManagers, others] = await Promise.all([
    ownedIds.length > 0
      ? supabaseAdmin
          .from("registry_managers")
          .select("registry_id, user_id")
          .in("registry_id", ownedIds)
          .neq("user_id", userId)
          .order("created_at")
      : Promise.resolve({ data: [], error: null }),
    managedIds.length > 0
      ? supabaseAdmin.from("registries").select("id, title").in("id", managedIds).order("created_at")
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (coManagers.error) fail("reading co-managers", coManagers.error);
  if (others.error) fail("reading managed registries", others.error);

  // A registry only goes to a real account. Guests have anonymous sessions,
  // and nothing should hand them a registry.
  const coManagerRows = (coManagers.data ?? []) as { registry_id: string; user_id: string }[];
  const candidates = [...new Set(coManagerRows.map((row) => row.user_id))];
  const accounts = new Set<string>();
  await Promise.all(
    candidates.map(async (id) => {
      const { data, error } = await supabaseAdmin.auth.admin.getUserById(id);
      if (error) fail("reading co-managers", error);
      if (data.user && !data.user.is_anonymous) accounts.add(id);
    }),
  );

  const newOwnerByRegistry = new Map<string, string>();
  for (const row of coManagerRows) {
    if (accounts.has(row.user_id) && !newOwnerByRegistry.has(row.registry_id)) {
      newOwnerByRegistry.set(row.registry_id, row.user_id);
    }
  }

  const newOwnerIds = [...new Set(newOwnerByRegistry.values())];
  const names = new Map<string, string>();
  if (newOwnerIds.length > 0) {
    const { data, error } = await supabaseAdmin.from("profiles").select("id, full_name").in("id", newOwnerIds);
    if (error) fail("reading co-managers' names", error);
    for (const p of data ?? []) {
      const name = (p.full_name as string | null)?.trim();
      if (name) names.set(p.id as string, name);
    }
  }

  const toDelete = ownedRegistries.filter((r) => !newOwnerByRegistry.has(r.id));
  const giftsByRegistry = await giftRecords(toDelete.map((r) => r.id));

  return {
    userId,
    deleted: toDelete.map((r) => {
      const gifts = giftsByRegistry.get(r.id) ?? [];
      return {
        id: r.id,
        title: r.title,
        purchaseIds: gifts.map((g) => g.id),
        gifts: gifts.filter((g) => g.status !== "cancelled").length,
      };
    }),
    handedOver: ownedRegistries
      .filter((r) => newOwnerByRegistry.has(r.id))
      .map((r) => {
        const newOwnerId = newOwnerByRegistry.get(r.id)!;
        return {
          id: r.id,
          title: r.title,
          listed: r.listed_on_profile,
          newOwnerId,
          newOwner: names.get(newOwnerId) ?? "The other manager",
        };
      }),
    leaving: ((others.data ?? []) as { id: string; title: string }[]).map((r) => ({ id: r.id, title: r.title })),
    eventIds: (events.data ?? []).map((e) => e.id as string),
  };
}

/** Every purchase row on these registries' items and gift funds, cancelled ones included. */
async function giftRecords(registryIds: string[]) {
  const byRegistry = new Map<string, { id: string; status: string }[]>();
  if (registryIds.length === 0) return byRegistry;

  const [items, funds] = await Promise.all([
    supabaseAdmin.from("registry_items").select("id, registry_id").in("registry_id", registryIds),
    supabaseAdmin.from("cash_funds").select("id, registry_id").in("registry_id", registryIds),
  ]);
  if (items.error) fail("reading items", items.error);
  if (funds.error) fail("reading gift funds", funds.error);

  const registryOf = new Map<string, string>();
  for (const row of [...(items.data ?? []), ...(funds.data ?? [])]) {
    registryOf.set(row.id as string, row.registry_id as string);
  }

  const lookups = [
    ...batches((items.data ?? []).map((i) => i.id as string)).map((ids) =>
      supabaseAdmin.from("purchases").select("id, status, registry_item_id, cash_fund_id").in("registry_item_id", ids),
    ),
    ...batches((funds.data ?? []).map((f) => f.id as string)).map((ids) =>
      supabaseAdmin.from("purchases").select("id, status, registry_item_id, cash_fund_id").in("cash_fund_id", ids),
    ),
  ];
  for (const { data, error } of await Promise.all(lookups)) {
    if (error) fail("reading gifts", error);
    for (const p of data ?? []) {
      const registryId = registryOf.get((p.registry_item_id ?? p.cash_fund_id) as string);
      if (!registryId) continue;
      const list = byRegistry.get(registryId) ?? [];
      if (!list.some((g) => g.id === p.id)) list.push({ id: p.id as string, status: p.status as string });
      byRegistry.set(registryId, list);
    }
  }
  return byRegistry;
}

/** What the confirmation shows. Leaves out ids, the other people's included. */
export function summarizeAccountDeletion(plan: AccountDeletionPlan): AccountDeletionSummary {
  return {
    deleted: plan.deleted.map((r) => ({ title: r.title, gifts: r.gifts })),
    handedOver: plan.handedOver.map((r) => ({ title: r.title, newOwner: r.newOwner })),
    leaving: plan.leaving.map((r) => ({ title: r.title })),
    events: plan.eventIds.length,
  };
}

/**
 * Deletes the account with this id. The caller must have checked that the
 * request comes from this account. Throws when the account wasn't deleted,
 * after putting back any registries it had started to hand over.
 */
export async function deleteAccount(userId: string): Promise<void> {
  const plan = await planAccountDeletion(userId);

  try {
    // 1. Hand over shared registries.
    for (const registry of plan.handedOver) await handOver(userId, registry);

    // 2. The account, and through the foreign keys everything above.
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) fail("deleting the user", error);
  } catch (error) {
    try {
      for (const registry of plan.handedOver) await takeBack(userId, registry);
    } catch (undoError) {
      console.error(undoError);
    }
    throw error;
  }

  // 3. What the foreign keys leave behind. The account is gone by now, so a
  //    failure here is logged rather than reported to the person.
  const cleanup = await Promise.allSettled([
    ...batches(plan.deleted.flatMap((r) => r.purchaseIds)).map(async (ids) => {
      const { error } = await supabaseAdmin.from("purchases").delete().in("id", ids);
      if (error) fail("deleting gifts", error);
    }),
    ...plan.deleted.map((r) => emptyFolder(REGISTRY_PHOTOS_BUCKET, r.id)),
    ...plan.eventIds.map((id) => emptyFolder(EVENT_IMAGES_BUCKET, id)),
  ]);
  for (const result of cleanup) {
    if (result.status === "rejected") console.error(result.reason);
  }
}

type HandOver = AccountDeletionPlan["handedOver"][number];

// The new owner's manager row changes first, so there's never a moment with no
// owner. The registry leaves the old owner's profile: the new owner hasn't
// chosen to list it on theirs.
async function handOver(userId: string, registry: HandOver) {
  const steps = [
    () =>
      supabaseAdmin
        .from("registry_managers")
        .update({ role: "owner" })
        .eq("registry_id", registry.id)
        .eq("user_id", registry.newOwnerId),
    () =>
      supabaseAdmin
        .from("registry_managers")
        .update({ role: "manager" })
        .eq("registry_id", registry.id)
        .eq("user_id", userId),
    () =>
      supabaseAdmin
        .from("registries")
        .update({ owner_id: registry.newOwnerId, listed_on_profile: false })
        .eq("id", registry.id)
        .eq("owner_id", userId),
  ];
  for (const step of steps) {
    const { error } = await step();
    if (error) fail("handing over a registry", error);
  }
}

// Undoes handOver when the account couldn't be deleted. Safe on a registry
// that was only partly handed over, or not at all.
async function takeBack(userId: string, registry: HandOver) {
  const steps = [
    () =>
      supabaseAdmin
        .from("registry_managers")
        .update({ role: "owner" })
        .eq("registry_id", registry.id)
        .eq("user_id", userId),
    () =>
      supabaseAdmin
        .from("registries")
        .update({ owner_id: userId, listed_on_profile: registry.listed })
        .eq("id", registry.id)
        .in("owner_id", [userId, registry.newOwnerId]),
    () =>
      supabaseAdmin
        .from("registry_managers")
        .update({ role: "manager" })
        .eq("registry_id", registry.id)
        .eq("user_id", registry.newOwnerId),
  ];
  for (const step of steps) {
    const { error } = await step();
    if (error) fail("putting back a registry", error);
  }
}

/** Removes every file in one registry's or event's folder. */
async function emptyFolder(bucket: string, folder: string) {
  const storage = supabaseAdmin.storage.from(bucket);
  for (;;) {
    const { data, error } = await storage.list(folder, { limit: 1000 });
    if (error) fail(`listing ${bucket}`, error);
    const paths = (data ?? []).filter((f) => f.id).map((f) => `${folder}/${f.name}`);
    if (paths.length === 0) return;
    const removed = await storage.remove(paths);
    if (removed.error) fail(`removing ${bucket} files`, removed.error);
    // Stop rather than list the same files again if nothing went.
    if ((removed.data ?? []).length === 0) return;
  }
}
