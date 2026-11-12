// Server-only reads for group gifts (src/lib/group-gifts.ts). The tables have
// no access rules for the API roles, so everything goes through the
// service-role client. Every read is filtered by a group gift's token, which
// only people the organizer shared it with have, or by an id the caller has
// already checked.

import crypto from "crypto";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { honoreeDisplayName } from "@/lib/registry-copy";
import { canManageRegistry } from "@/lib/events-server";
import { listsForItems } from "@/lib/list-items";
import {
  groupGiftStatus,
  isGroupGiftToken,
  type EventGroupGift,
  type GroupGiftStatus,
  type GroupGiftView,
  type GroupGiftViewer,
} from "@/lib/group-gifts";

/** A new secret for a share link or a pledge. */
export function newGroupGiftToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

// ── The pledges cookie ───────────────────────────────────────────────────
//
// Remembers which pledge this browser made on each group gift, as group gift
// token to pledge token, so a pledger without an account can change it on
// their next visit. httpOnly, since the pledge token is the proof.

export const GROUP_GIFT_PLEDGES_COOKIE = "regibee_group_pledges";

const PLEDGES_COOKIE_OPTIONS = {
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax" as const,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
};

/** Keeps the cookie small. The oldest pledges drop off first. */
const MAX_REMEMBERED_PLEDGES = 20;

function parsePledgesCookie(raw: string | undefined): Record<string, string> {
  if (!raw) return {};
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return {};
    return Object.fromEntries(
      Object.entries(data).filter(([gift, pledge]) => isGroupGiftToken(gift) && isGroupGiftToken(pledge)),
    ) as Record<string, string>;
  } catch {
    return {};
  }
}

/** The pledge token this browser holds for a group gift, if any. */
export async function rememberedPledgeToken(giftToken: string): Promise<string | null> {
  const store = await cookies();
  return parsePledgesCookie(store.get(GROUP_GIFT_PLEDGES_COOKIE)?.value)[giftToken] ?? null;
}

/** Saves or forgets this browser's pledge on a group gift. Server actions only. */
export async function rememberPledge(giftToken: string, pledgeToken: string | null) {
  const store = await cookies();
  const entries = parsePledgesCookie(store.get(GROUP_GIFT_PLEDGES_COOKIE)?.value);
  delete entries[giftToken];
  if (pledgeToken) entries[giftToken] = pledgeToken;
  const kept = Object.entries(entries).slice(-MAX_REMEMBERED_PLEDGES);
  store.set(GROUP_GIFT_PLEDGES_COOKIE, JSON.stringify(Object.fromEntries(kept)), PLEDGES_COOKIE_OPTIONS);
}

// ── Loading one group gift ───────────────────────────────────────────────

export interface GroupGiftRow {
  id: string;
  token: string;
  registry_id: string;
  item_id: string | null;
  purchase_id: string | null;
  event_id: string | null;
  organizer_id: string;
  goal_amount: number | string | null;
  payback_note: string | null;
}

export interface PledgeRow {
  id: string;
  token: string;
  user_id: string | null;
  name: string;
  email: string | null;
  amount: number | string;
  paid_at: string | null;
  created_at: string;
}

export interface LoadedGroupGift {
  gift: GroupGiftRow;
  status: GroupGiftStatus;
  item: { id: string; title: string; image_url: string | null; external_url: string | null; price: number | null } | null;
  registry: {
    id: string;
    slug: string;
    title: string;
    owner_id: string;
    honoree_names: string | null;
    parent_names: string | null;
  };
  organizerName: string;
  pledges: PledgeRow[];
  event: { title: string; slug: string } | null;
}

const GIFT_FIELDS = "id, token, registry_id, item_id, purchase_id, event_id, organizer_id, goal_amount, payback_note";
const PLEDGE_FIELDS = "id, token, user_id, name, email, amount, paid_at, created_at";

/** The group gift row alone, by its token. */
export async function findGroupGift(token: unknown): Promise<GroupGiftRow | null> {
  if (!isGroupGiftToken(token)) return null;
  const { data } = await supabaseAdmin.from("group_gifts").select(GIFT_FIELDS).eq("token", token).maybeSingle();
  return (data as GroupGiftRow | null) ?? null;
}

/** Where a group gift stands, from its reservation. */
export async function statusOfGroupGift(gift: Pick<GroupGiftRow, "purchase_id">): Promise<GroupGiftStatus> {
  if (!gift.purchase_id) return "ended";
  const { data } = await supabaseAdmin.from("purchases").select("status").eq("id", gift.purchase_id).maybeSingle();
  return groupGiftStatus(data);
}

/** Everything the group gift page needs, by the token in its link. */
export async function loadGroupGift(token: unknown): Promise<LoadedGroupGift | null> {
  const gift = await findGroupGift(token);
  if (!gift) return null;

  const [{ data: registry }, { data: item }, { data: organizer }, { data: pledges }, status, { data: event }] =
    await Promise.all([
      supabaseAdmin
        .from("registries")
        .select("id, slug, title, owner_id, honoree_names, parent_names")
        .eq("id", gift.registry_id)
        .maybeSingle(),
      gift.item_id
        ? supabaseAdmin
            .from("registry_items")
            .select("id, title, image_url, external_url, price")
            .eq("id", gift.item_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabaseAdmin.from("profiles").select("full_name").eq("id", gift.organizer_id).maybeSingle(),
      supabaseAdmin
        .from("group_gift_pledges")
        .select(PLEDGE_FIELDS)
        .eq("group_gift_id", gift.id)
        .order("created_at"),
      statusOfGroupGift(gift),
      gift.event_id
        ? supabaseAdmin.from("events").select("title, slug").eq("id", gift.event_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
  if (!registry) return null;

  return {
    gift,
    status,
    item: (item as LoadedGroupGift["item"]) ?? null,
    registry: registry as LoadedGroupGift["registry"],
    organizerName: (organizer?.full_name as string | null)?.trim() || "The organizer",
    pledges: (pledges ?? []) as PledgeRow[],
    event: (event as LoadedGroupGift["event"]) ?? null,
  };
}

function amountOf(value: number | string | null): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function sumPledges(pledges: Pick<PledgeRow, "amount">[]): number {
  return Math.round(pledges.reduce((sum, p) => sum + amountOf(p.amount), 0) * 100) / 100;
}

/**
 * The page's view of a group gift, for this viewer. The organizer sees every
 * pledge: name, email, amount and whether it's paid. Everyone else sees who's
 * in and the total, and their own amount, but not what others pledged.
 */
export function groupGiftViewFor(
  loaded: LoadedGroupGift,
  opts: {
    viewerId: string | null;
    /** From the pledger's email link or this browser's cookie. */
    pledgeToken: string | null;
    prefill: GroupGiftViewer["prefill"];
  },
): { view: GroupGiftView; viewer: GroupGiftViewer } {
  const { gift, item, registry, pledges } = loaded;
  const isOrganizer = Boolean(opts.viewerId) && gift.organizer_id === opts.viewerId;
  const mine =
    (opts.viewerId ? pledges.find((p) => p.user_id === opts.viewerId) : undefined) ??
    (opts.pledgeToken ? pledges.find((p) => p.token === opts.pledgeToken) : undefined) ??
    null;

  const view: GroupGiftView = {
    token: gift.token,
    status: loaded.status,
    item: {
      title: item?.title ?? "A gift",
      imageUrl: item?.image_url ?? null,
      url: item?.external_url ?? null,
      price: item?.price != null ? amountOf(item.price) : null,
      onList: Boolean(item),
    },
    recipientName: honoreeDisplayName(registry, registry.title),
    listTitle: registry.title,
    listSlug: registry.slug,
    organizerName: loaded.organizerName,
    goalAmount: gift.goal_amount != null ? amountOf(gift.goal_amount) : null,
    paybackNote: gift.payback_note,
    pledged: sumPledges(pledges),
    pledges: pledges.map((p) => {
      const isMine = p.id === mine?.id;
      return {
        id: isOrganizer ? p.id : null,
        name: p.name,
        amount: isOrganizer || isMine ? amountOf(p.amount) : null,
        email: isOrganizer ? p.email : null,
        paid: Boolean(p.paid_at),
        isMine,
      };
    }),
    event: loaded.event,
  };

  return {
    view,
    viewer: {
      role: isOrganizer ? "organizer" : mine ? "pledger" : "visitor",
      signedIn: Boolean(opts.viewerId),
      myPledge: mine ? { token: mine.token, name: mine.name, amount: amountOf(mine.amount), paid: Boolean(mine.paid_at) } : null,
      prefill: opts.prefill,
    },
  };
}

/**
 * Whether this person manages a list the group gift's item is on: the list it
 * was started from, or any other list of the owner's the item is placed on
 * (src/lib/list-items.ts). They never see the pledges.
 */
export async function managesGroupGiftList(
  userId: string,
  gift: { registry_id: string; item_id: string | null },
): Promise<boolean> {
  const lists = new Set([gift.registry_id]);
  if (gift.item_id) {
    for (const id of (await listsForItems([gift.item_id])).get(gift.item_id) ?? []) lists.add(id);
  }
  const answers = await Promise.all([...lists].map((id) => canManageRegistry(userId, id)));
  return answers.some(Boolean);
}

// ── Group gifts elsewhere ────────────────────────────────────────────────

/**
 * The viewer's own group gifts on these items, by item id, for a list's page:
 * the ones they organize or chipped in on while signed in. Ended ones are
 * left out, since the item is open again. By item rather than list, since an
 * item can be on several of its owner's lists.
 */
export async function myGroupGiftsOnItems(
  itemIds: string[],
  userId: string,
): Promise<Record<string, { token: string; organizer: boolean }>> {
  if (itemIds.length === 0) return {};
  const [{ data: organized }, { data: pledged }] = await Promise.all([
    supabaseAdmin
      .from("group_gifts")
      .select("token, item_id, purchase_id")
      .in("item_id", itemIds)
      .eq("organizer_id", userId),
    supabaseAdmin
      .from("group_gift_pledges")
      .select("group_gifts!inner(token, item_id, purchase_id)")
      .eq("user_id", userId)
      .in("group_gifts.item_id", itemIds),
  ]);

  type Row = { token: string; item_id: string | null; purchase_id: string | null };
  const rows: { row: Row; organizer: boolean }[] = [
    ...((organized ?? []) as Row[]).map((row) => ({ row, organizer: true })),
    ...((pledged ?? []) as unknown as { group_gifts: Row }[]).map((p) => ({ row: p.group_gifts, organizer: false })),
  ].filter(({ row }) => row?.item_id && row.purchase_id);
  if (rows.length === 0) return {};

  const { data: purchases } = await supabaseAdmin
    .from("purchases")
    .select("id, status")
    .in("id", [...new Set(rows.map(({ row }) => row.purchase_id!))]);
  const statusById = new Map((purchases ?? []).map((p) => [p.id as string, groupGiftStatus(p)]));

  const result: Record<string, { token: string; organizer: boolean }> = {};
  for (const { row, organizer } of rows) {
    if (statusById.get(row.purchase_id!) === "ended") continue;
    if (result[row.item_id!]?.organizer) continue;
    result[row.item_id!] = { token: row.token, organizer };
  }
  return result;
}

/**
 * Which of these lists belong to the person looking: lists the signed-in
 * viewer manages, and lists managed by the account with the guest's email.
 * Their group gifts stay hidden from them.
 */
export async function listsOfViewer(
  registryIds: string[],
  opts: { viewerId: string | null; guestEmail: string | null },
): Promise<string[]> {
  if (registryIds.length === 0) return [];
  const [{ data: registries }, { data: managers }] = await Promise.all([
    supabaseAdmin.from("registries").select("id, owner_id").in("id", registryIds),
    supabaseAdmin.from("registry_managers").select("registry_id, user_id").in("registry_id", registryIds),
  ]);
  const managersOf = new Map<string, Set<string>>();
  for (const r of registries ?? []) managersOf.set(r.id as string, new Set([r.owner_id as string]));
  for (const m of managers ?? []) managersOf.get(m.registry_id as string)?.add(m.user_id as string);

  const guestEmail = opts.guestEmail?.trim().toLowerCase() || null;
  const emailById = new Map<string, string | null>();
  if (guestEmail) {
    const ids = [...new Set([...managersOf.values()].flatMap((set) => [...set]))];
    await Promise.all(
      ids.map(async (id) => {
        const { data } = await supabaseAdmin.auth.admin.getUserById(id);
        emailById.set(id, data?.user?.email?.toLowerCase() ?? null);
      }),
    );
  }

  return [...managersOf.entries()]
    .filter(([, ids]) =>
      [...ids].some((id) => id === opts.viewerId || (guestEmail !== null && emailById.get(id) === guestEmail)),
    )
    .map(([registryId]) => registryId);
}

/**
 * Group gifts started from an event, for its guests' invitation page. Ended
 * ones are left out, and so are gifts on the lists in hideRegistryIds: lists
 * the viewer owns or manages, so their surprise stays one.
 */
export async function groupGiftsForEvent(
  eventId: string,
  opts: { hideRegistryIds?: string[] } = {},
): Promise<EventGroupGift[]> {
  const { data: gifts } = await supabaseAdmin
    .from("group_gifts")
    .select(`${GIFT_FIELDS}, created_at`)
    .eq("event_id", eventId)
    .order("created_at");
  const hidden = new Set(opts.hideRegistryIds ?? []);
  const rows = ((gifts ?? []) as GroupGiftRow[]).filter((g) => g.purchase_id && g.item_id && !hidden.has(g.registry_id));
  if (rows.length === 0) return [];

  const [{ data: purchases }, { data: items }, { data: registries }, { data: organizers }, { data: pledges }] =
    await Promise.all([
      supabaseAdmin.from("purchases").select("id, status").in("id", rows.map((g) => g.purchase_id!)),
      supabaseAdmin.from("registry_items").select("id, title, image_url").in("id", rows.map((g) => g.item_id!)),
      supabaseAdmin
        .from("registries")
        .select("id, title, honoree_names, parent_names")
        .in("id", [...new Set(rows.map((g) => g.registry_id))]),
      supabaseAdmin.from("profiles").select("id, full_name").in("id", [...new Set(rows.map((g) => g.organizer_id))]),
      supabaseAdmin.from("group_gift_pledges").select("group_gift_id, amount").in("group_gift_id", rows.map((g) => g.id)),
    ]);

  const statusById = new Map((purchases ?? []).map((p) => [p.id as string, groupGiftStatus(p)]));
  const itemById = new Map((items ?? []).map((i) => [i.id as string, i]));
  const registryById = new Map((registries ?? []).map((r) => [r.id as string, r]));
  const organizerById = new Map((organizers ?? []).map((p) => [p.id as string, (p.full_name as string | null)?.trim()]));

  const result: EventGroupGift[] = [];
  for (const g of rows) {
    const status = statusById.get(g.purchase_id!);
    const item = itemById.get(g.item_id!);
    const registry = registryById.get(g.registry_id);
    if (!status || status === "ended" || !item || !registry) continue;
    const mine = (pledges ?? []).filter((p) => p.group_gift_id === g.id) as Pick<PledgeRow, "amount">[];
    result.push({
      token: g.token,
      status,
      itemTitle: item.title as string,
      imageUrl: (item.image_url as string | null) ?? null,
      recipientName: honoreeDisplayName(registry as never, registry.title as string),
      organizerName: organizerById.get(g.organizer_id) || "Someone",
      goalAmount: g.goal_amount != null ? amountOf(g.goal_amount) : null,
      pledged: sumPledges(mine),
      pledgeCount: mine.length,
    });
  }
  return result;
}
