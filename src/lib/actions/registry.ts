"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import {
  notifyCashFundContribution,
  notifyNewSuggestion,
  sendManagerInvite,
  confirmCashFundContribution,
  getRegistryInfoForBuyer,
} from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { registryPhotoUrlPrefix } from "@/lib/registry-photos";
import { buildBuyerRegistryUrl } from "@/lib/buyer-link";
import {
  getStore,
  isLinkForStore,
  isStoreId,
  MAX_RETAILER_REGISTRIES,
  parseHiddenPlainLinkItems,
  type RetailerRegistry,
} from "@/lib/retailers";
import { isUuid } from "@/lib/extension";
import { parseStorePerksState, storePerksSettings } from "@/lib/store-perks";
import { MY_GIFTS_COOKIE, MY_GIFTS_COOKIE_OPTIONS, withGift } from "@/lib/my-gifts-cookie";
import { GIFT_HOLD_DAYS, isOpenReservation } from "@/lib/gifts";
import {
  releaseExpiredOnItem,
  sendCoverGiftEmails,
  sendGiftConfirmedEmails,
  sendReservationEmail,
  sendReservationEndedEmails,
} from "@/lib/gift-reservations-server";
import crypto from "crypto";

async function addToMyGiftsCookie(
  key: "items" | "funds",
  id: string,
  value: string | number
) {
  const cookieStore = await cookies();
  const raw = cookieStore.get(MY_GIFTS_COOKIE)?.value;
  cookieStore.set(MY_GIFTS_COOKIE, withGift(raw, key, id, value), MY_GIFTS_COOKIE_OPTIONS);
}

function generateSlug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    Math.random().toString(36).substring(2, 8)
  );
}

async function requireManager(registryId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, role: null, error: "Not authenticated" } as const;
  }

  // Try registry_managers table first
  const { data: manager, error: managerError } = await supabaseAdmin
    .from("registry_managers")
    .select("role")
    .eq("registry_id", registryId)
    .eq("user_id", user.id)
    .single();

  if (manager) {
    return { user, role: manager.role as "owner" | "manager", error: null } as const;
  }

  // Fall back to owner_id check if table doesn't exist or no record found
  const { data: registry } = await supabaseAdmin
    .from("registries")
    .select("owner_id")
    .eq("id", registryId)
    .single();

  if (registry?.owner_id === user.id) {
    return { user, role: "owner" as const, error: null } as const;
  }

  return { user, role: null, error: "Not authorized" } as const;
}

const BABY_DEFAULT_CATEGORIES = [
  "Nursery & Sleep",
  "Feeding",
  "Diapering",
  "Gear & Travel",
  "Bath",
  "Clothing",
  "Health & Safety",
  "Toys & Books",
  "Maternity & Postpartum",
  "Gifts & Extras",
];

const VALID_REGISTRY_TYPES = ["baby", "personal"] as const;
const VALID_EVENT_TYPES = [
  "birthday",
  "christmas",
  "wedding",
  "housewarming",
  "graduation",
  "other",
] as const;

export async function createRegistry(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const title = formData.get("title") as string;
  const eventDate = formData.get("eventDate") as string;
  const description = formData.get("description") as string;
  const isPublic = formData.get("isPublic") !== "false";
  const listedOnProfile = formData.get("listedOnProfile") === "true";
  const zipCode = formData.get("zipCode") as string;
  const taxEnabled = formData.get("taxEnabled") === "true";
  const venmo = formData.get("venmo") as string;
  const paypal = formData.get("paypal") as string;
  const zelle = formData.get("zelle") as string;
  const slug = generateSlug(title);

  const rawRegistryType = (formData.get("registryType") as string) || "baby";
  const registryType = (VALID_REGISTRY_TYPES as readonly string[]).includes(
    rawRegistryType,
  )
    ? (rawRegistryType as (typeof VALID_REGISTRY_TYPES)[number])
    : "baby";

  const rawEventType = formData.get("eventType") as string | null;
  const eventType =
    registryType === "personal" &&
    rawEventType &&
    (VALID_EVENT_TYPES as readonly string[]).includes(rawEventType)
      ? (rawEventType as (typeof VALID_EVENT_TYPES)[number])
      : null;

  const settings: Record<string, unknown> = {};
  if (zipCode) settings.zip_code = zipCode;
  settings.tax_enabled = taxEnabled;
  const paymentMethods: Record<string, string> = {};
  if (venmo) paymentMethods.venmo = venmo;
  if (paypal) paymentMethods.paypal = paypal;
  if (zelle) paymentMethods.zelle = zelle;
  if (Object.keys(paymentMethods).length > 0) settings.payment_methods = paymentMethods;

  const { data: registry, error } = await supabase
    .from("registries")
    .insert({
      owner_id: user.id,
      title,
      slug,
      event_date: eventDate || null,
      description: description || null,
      is_public: isPublic,
      listed_on_profile: listedOnProfile,
      registry_type: registryType,
      event_type: eventType,
      settings: Object.keys(settings).length > 0 ? settings : null,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  // Baby registries get the curated 10-category seed; personal registries start
  // empty and the owner adds categories as they go.
  if (registryType === "baby") {
    await supabase.from("categories").insert(
      BABY_DEFAULT_CATEGORIES.map((name, index) => ({
        registry_id: registry.id,
        name,
        sort_order: index,
      })),
    );
  }

  redirect(`/dashboard/registry/${registry.id}`);
}

export async function updateRegistry(registryId: string, formData: FormData) {
  const { user, role, error: authError } = await requireManager(registryId);
  if (authError || !user) return { error: authError || "Not authenticated" };

  const supabase = await createClient();
  const title = formData.get("title") as string;
  // honoreeNames is the new neutral field; parentNames is kept as an alias
  // for the baby settings form until that UI is migrated.
  const honoreeNamesRaw =
    (formData.get("honoreeNames") as string | null) ??
    (formData.get("parentNames") as string | null) ??
    "";
  const honoreeNames = honoreeNamesRaw.trim();
  const eventDate = formData.get("eventDate") as string;
  const description = formData.get("description") as string;
  const isPublic = formData.get("isPublic") === "true";

  // A listed registry appears under its owner's name, so only the owner can
  // change this. Private ones stay listed, but only approved followers see them.
  const listedField = formData.get("listedOnProfile");
  const listing: { listed_on_profile?: boolean } = {};
  if (role === "owner" && listedField !== null) {
    listing.listed_on_profile = listedField === "true";
  }

  const { error } = await supabase
    .from("registries")
    .update({
      title,
      honoree_names: honoreeNames || null,
      parent_names: honoreeNames || null,
      event_date: eventDate || null,
      description: description || null,
      is_public: isPublic,
      ...listing,
    })
    .eq("id", registryId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/registry/${registryId}`);
  return { success: true };
}

export async function deleteRegistry(registryId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("registries")
    .delete()
    .eq("id", registryId)
    .eq("owner_id", user.id);

  if (error) {
    return { error: error.message };
  }

  redirect("/dashboard");
}

export async function addRegistryItem(registryId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const title = formData.get("title") as string;
  const categoryId = formData.get("categoryId") as string;
  const externalUrl = formData.get("externalUrl") as string;
  const imageUrl = formData.get("imageUrl") as string;
  const price = formData.get("price") as string;
  const quantityNeeded = formData.get("quantityNeeded") as string;
  const isEssential = formData.get("isEssential") === "true";
  const isParentPurchased = formData.get("isParentPurchased") === "true";
  const isOpenToUsed = formData.get("isOpenToUsed") === "true";
  const minimumCondition = formData.get("minimumCondition") as string;
  const notes = formData.get("notes") as string;
  const qty = quantityNeeded ? parseInt(quantityNeeded) : 1;

  const { error } = await supabase.from("registry_items").insert({
    registry_id: registryId,
    category_id: categoryId || null,
    title,
    external_url: externalUrl || null,
    image_url: imageUrl || null,
    price: price ? parseFloat(price) : null,
    quantity_needed: qty,
    quantity_fulfilled: isParentPurchased ? qty : 0,
    is_essential: isEssential,
    is_parent_purchased: isParentPurchased,
    is_open_to_used: isOpenToUsed,
    minimum_condition: isOpenToUsed ? minimumCondition || null : null,
    notes: notes || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/registry/${registryId}`);
  return { success: true };
}

export async function updateRegistryItem(
  itemId: string,
  registryId: string,
  formData: FormData
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const title = formData.get("title") as string;
  const categoryId = formData.get("categoryId") as string;
  const externalUrl = formData.get("externalUrl") as string;
  const imageUrl = formData.get("imageUrl") as string;
  const price = formData.get("price") as string;
  const quantityNeeded = formData.get("quantityNeeded") as string;
  const isEssential = formData.get("isEssential") === "true";
  const isOpenToUsed = formData.get("isOpenToUsed") === "true";
  const minimumCondition = formData.get("minimumCondition") as string;
  const notes = formData.get("notes") as string;

  const { error } = await supabase
    .from("registry_items")
    .update({
      title,
      category_id: categoryId || null,
      external_url: externalUrl || null,
      image_url: imageUrl || null,
      price: price ? parseFloat(price) : null,
      quantity_needed: quantityNeeded ? parseInt(quantityNeeded) : 1,
      is_essential: isEssential,
      is_open_to_used: isOpenToUsed,
      minimum_condition: isOpenToUsed ? minimumCondition || null : null,
      notes: notes || null,
    })
    .eq("id", itemId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/registry/${registryId}`);
  return { success: true };
}

export async function deleteRegistryItem(itemId: string, registryId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("registry_items")
    .delete()
    .eq("id", itemId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/registry/${registryId}`);
  return { success: true };
}

export async function addCashFund(registryId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const goalAmount = formData.get("goalAmount") as string;

  const { error } = await supabase.from("cash_funds").insert({
    registry_id: registryId,
    title,
    description: description || null,
    goal_amount: goalAmount ? parseFloat(goalAmount) : null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/registry/${registryId}`);
  return { success: true };
}

export async function updateCashFund(
  fundId: string,
  registryId: string,
  formData: FormData
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const goalAmount = formData.get("goalAmount") as string;

  const { error } = await supabase
    .from("cash_funds")
    .update({
      title,
      description: description || null,
      goal_amount: goalAmount ? parseFloat(goalAmount) : null,
    })
    .eq("id", fundId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/registry/${registryId}`);
  return { success: true };
}

export async function deleteCashFund(fundId: string, registryId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("cash_funds")
    .delete()
    .eq("id", fundId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/registry/${registryId}`);
  return { success: true };
}

export type ReserveItemResult =
  | { error: string }
  | {
      success: true;
      purchaseId: string;
      status: "reserved" | "purchased";
      reservedUntil: string | null;
      shippingAddress?: string;
    };

/**
 * A guest reserves an item, which holds it for GIFT_HOLD_DAYS while they buy
 * it. With alreadyBought set, the guest bought it before coming here, so the
 * gift is saved as purchased straight away.
 */
export async function reserveItem(formData: FormData): Promise<ReserveItemResult> {
  const supabase = await createClient();

  const itemId = formData.get("itemId") as string;
  const quantity = parseInt(formData.get("quantity") as string) || 1;
  const buyerName = String(formData.get("buyerName") ?? "").trim();
  const buyerEmail = String(formData.get("buyerEmail") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const alreadyBought = formData.get("alreadyBought") === "1";

  if (!isUuid(itemId)) return { error: "This item isn't on the registry anymore." };
  if (!buyerName || !buyerEmail) return { error: "Add your name and email." };

  // Ensure the gift giver has at least an anonymous session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    await supabase.auth.signInAnonymously();
  }

  // The daily job releases reservations that ran out, but the registry page
  // already shows those items as available, so free them up now.
  const released = await releaseExpiredOnItem(itemId).catch((err) => {
    console.error("[gifts] Failed to release expired reservations:", err);
    return [] as string[];
  });

  const { data: purchaseId, error } = await supabase.rpc("reserve_registry_item", {
    p_item_id: itemId,
    p_quantity: quantity,
    p_buyer_name: buyerName,
    p_buyer_email: buyerEmail,
    p_message: message || null,
    p_hold_days: alreadyBought ? null : GIFT_HOLD_DAYS,
  });

  if (error || !purchaseId) {
    if (released.length > 0) after(() => sendReservationEndedEmails(released));
    if (error?.message.startsWith("Not enough quantity")) {
      return { error: "Another guest just reserved this. Pick another gift, or check back in a couple of days." };
    }
    return { error: error?.message ?? "Couldn't reserve this gift. Try again." };
  }

  if (alreadyBought) {
    const { error: confirmError } = await supabaseAdmin.rpc("confirm_registry_gift", {
      p_purchase_id: purchaseId,
    });
    if (confirmError) console.error("[gifts] Failed to confirm a gift bought before reserving:", confirmError);
  }

  // Store the purchase id rather than a flag: the public registry page only
  // reveals the shipping address on return visits when this id matches a live
  // purchase of the item, and purchase ids never appear in public page data.
  // Holding the id is also what lets this guest confirm or release the gift.
  await addToMyGiftsCookie("items", itemId, purchaseId);

  // The address isn't in the public page data, so hand it back to the dialog
  // now that this visitor has reserved a gift.
  const [registryInfo, { data: saved }] = await Promise.all([
    getRegistryInfoForBuyer({ itemId }).catch(() => null),
    supabaseAdmin.from("purchases").select("status, reserved_until").eq("id", purchaseId).single(),
  ]);

  // Send emails after the response (keeps the function alive). The owners
  // hear about a gift once the guest says they bought it, so a reservation
  // that gets released never reaches them.
  after(async () => {
    try {
      if (alreadyBought) await sendGiftConfirmedEmails(purchaseId);
      else await sendReservationEmail(purchaseId);
      await sendReservationEndedEmails(released);
    } catch (err) {
      console.error("[email] Failed to send reserve emails:", err);
    }
  });

  if (registryInfo) revalidatePath(`/r/${registryInfo.slug}`);

  const open = saved ? isOpenReservation(saved) : !alreadyBought;
  return {
    success: true,
    purchaseId,
    status: open ? "reserved" : "purchased",
    reservedUntil: open ? saved?.reserved_until ?? null : null,
    shippingAddress: registryInfo?.shippingAddress,
  };
}

/**
 * Loads a gift a guest wants to change. The purchase id is the guest's proof:
 * it's only in their gifts cookie and their own emails, never in public page
 * data, the same rule the registry page uses to show them the address.
 */
async function loadGuestGift(purchaseId: string) {
  if (!isUuid(purchaseId)) return null;
  const { data: purchase } = await supabaseAdmin
    .from("purchases")
    .select("id, status, registry_item_id")
    .eq("id", purchaseId)
    .single();
  if (!purchase?.registry_item_id) return null;

  const { data: item } = await supabaseAdmin
    .from("registry_items")
    .select("is_parent_purchased, registry_id")
    .eq("id", purchase.registry_item_id)
    .single();
  if (!item) return null;

  const { data: registry } = await supabaseAdmin
    .from("registries")
    .select("slug")
    .eq("id", item.registry_id)
    .single();
  return {
    purchase,
    slug: registry?.slug as string | undefined,
    // Money sent for an item the owners bought themselves. It's saved as
    // given when the guest sends it, so there's nothing to confirm.
    isCover: !!item.is_parent_purchased,
  };
}

/** The guest bought the item they reserved. */
export async function confirmGift(purchaseId: string): Promise<{ error?: string; success?: true }> {
  const gift = await loadGuestGift(purchaseId);
  if (!gift || gift.isCover) return { error: "We couldn't find this gift." };
  if (gift.purchase.status === "cancelled") {
    return { error: "This reservation ended, so the item went back on the list." };
  }

  const { data: changed, error } = await supabaseAdmin.rpc("confirm_registry_gift", {
    p_purchase_id: purchaseId,
  });
  if (error) return { error: error.message };

  if (changed) {
    after(async () => {
      try {
        await sendGiftConfirmedEmails(purchaseId);
      } catch (err) {
        console.error("[email] Failed to send gift confirmed emails:", err);
      }
    });
  }

  if (gift.slug) revalidatePath(`/r/${gift.slug}`);
  return { success: true };
}

/**
 * The guest isn't getting the item after all, or didn't send the money for an
 * item the owners bought, so it goes back on the list. release_registry_gift
 * leaves the fulfilled count alone for the second kind.
 */
export async function releaseGift(purchaseId: string): Promise<{ error?: string; success?: true }> {
  const gift = await loadGuestGift(purchaseId);
  if (!gift) return { error: "We couldn't find this gift." };

  const { error } = await supabaseAdmin.rpc("release_registry_gift", {
    p_purchase_id: purchaseId,
  });
  if (error) return { error: error.message };

  if (gift.slug) revalidatePath(`/r/${gift.slug}`);
  return { success: true };
}

// ============================================================================
// Phase 2-5: New server actions
// ============================================================================

export async function createCategory(registryId: string, name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Get max sort_order for this registry
  const { data: existing } = await supabase
    .from("categories")
    .select("sort_order")
    .eq("registry_id", registryId)
    .order("sort_order", { ascending: false })
    .limit(1);

  const nextOrder = existing && existing.length > 0 ? existing[0].sort_order + 1 : 0;

  const { data, error } = await supabase
    .from("categories")
    .insert({
      registry_id: registryId,
      name,
      sort_order: nextOrder,
    })
    .select("id, name, sort_order")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/registry/${registryId}`);
  return { success: true, category: data };
}

export async function updateCategory(
  categoryId: string,
  registryId: string,
  name: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("categories")
    .update({ name })
    .eq("id", categoryId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/registry/${registryId}`);
  return { success: true };
}

export async function deleteCategory(categoryId: string, registryId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("categories")
    .delete()
    .eq("id", categoryId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/registry/${registryId}`);
  return { success: true };
}

export async function updatePaymentMethods(
  registryId: string,
  formData: FormData
) {
  const { user, error: authError } = await requireManager(registryId);
  if (authError || !user) return { error: authError || "Not authenticated" };

  const supabase = await createClient();
  const venmo = (formData.get("venmo") as string)?.trim() || undefined;
  const paypal = (formData.get("paypal") as string)?.trim() || undefined;
  const zelle = (formData.get("zelle") as string)?.trim() || undefined;

  const { data: registry } = await supabase
    .from("registries")
    .select("settings")
    .eq("id", registryId)
    .single();

  if (!registry) {
    return { error: "Registry not found" };
  }

  const settings = (registry.settings as Record<string, unknown>) || {};
  settings.payment_methods = { venmo, paypal, zelle };

  const { error } = await supabase
    .from("registries")
    .update({ settings })
    .eq("id", registryId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/registry/${registryId}`);
  return { success: true };
}

export async function updateShippingAddress(
  registryId: string,
  address: string
) {
  const { user, error: authError } = await requireManager(registryId);
  if (authError || !user) return { error: authError || "Not authenticated" };

  const supabase = await createClient();
  const { data: registry } = await supabase
    .from("registries")
    .select("settings")
    .eq("id", registryId)
    .single();

  if (!registry) {
    return { error: "Registry not found" };
  }

  const settings = (registry.settings as Record<string, unknown>) || {};
  settings.shipping_address = address.trim() || null;

  const { error } = await supabase
    .from("registries")
    .update({ settings })
    .eq("id", registryId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/registry/${registryId}`);
  revalidatePath(`/dashboard/registry/${registryId}/settings`);
  return { success: true };
}

export async function updateRetailerRegistries(
  registryId: string,
  registries: { store: string; url: string }[]
) {
  const { user, error: authError } = await requireManager(registryId);
  if (authError || !user) return { error: authError || "Not authenticated" };

  if (!Array.isArray(registries) || registries.length > MAX_RETAILER_REGISTRIES) {
    return { error: "Invalid store registries" };
  }

  // Server actions can be called directly, so check every entry here too.
  const cleaned: RetailerRegistry[] = [];
  for (const entry of registries) {
    const store = entry?.store;
    const rawUrl = typeof entry?.url === "string" ? entry.url.trim() : "";
    if (!isStoreId(store)) return { error: "Unknown store" };
    if (cleaned.some((r) => r.store === store)) {
      return { error: `You've already linked a ${getStore(store).name} registry.` };
    }
    const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    if (!rawUrl || url.length > 2000 || !isLinkForStore(url, store)) {
      return { error: `That doesn't look like a ${getStore(store).name} link.` };
    }
    cleaned.push({ store, url });
  }

  const supabase = await createClient();
  const { data: registry } = await supabase
    .from("registries")
    .select("settings")
    .eq("id", registryId)
    .single();

  if (!registry) {
    return { error: "Registry not found" };
  }

  const settings = (registry.settings as Record<string, unknown>) || {};
  settings.retailer_registries = cleaned;

  const { error } = await supabase
    .from("registries")
    .update({ settings })
    .eq("id", registryId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/registry/${registryId}`);
  revalidatePath(`/dashboard/registry/${registryId}/settings`);
  return { success: true, registries: cleaned };
}

/** Records a welcome box the owner asked for, or turns perk emails on or off. */
export async function updateStorePerks(
  registryId: string,
  change: { welcomeBoxDone?: { store: string; done: boolean }; emails?: boolean }
) {
  const { user, error: authError } = await requireManager(registryId);
  if (authError || !user) return { error: authError || "Not authenticated" };

  // Server actions can be called directly, so check the input here too.
  const welcomeBox = change?.welcomeBoxDone;
  if (welcomeBox && (!isStoreId(welcomeBox.store) || typeof welcomeBox.done !== "boolean")) {
    return { error: "Invalid store perk" };
  }
  if (change?.emails !== undefined && typeof change.emails !== "boolean") {
    return { error: "Invalid store perk" };
  }

  const supabase = await createClient();
  const { data: registry } = await supabase
    .from("registries")
    .select("settings")
    .eq("id", registryId)
    .single();

  if (!registry) {
    return { error: "Registry not found" };
  }

  const settings = (registry.settings as Record<string, unknown>) || {};
  const state = parseStorePerksState(settings);
  if (welcomeBox && isStoreId(welcomeBox.store)) {
    const store = welcomeBox.store;
    state.welcomeBoxDone = welcomeBox.done
      ? [...new Set([...state.welcomeBoxDone, store])]
      : state.welcomeBoxDone.filter((s) => s !== store);
  }
  if (typeof change.emails === "boolean") {
    state.emails = change.emails;
  }
  settings.store_perks = storePerksSettings(state);

  const { error } = await supabase
    .from("registries")
    .update({ settings })
    .eq("id", registryId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/registry/${registryId}`);
  return { success: true };
}

/**
 * Stops the dashboard reminding the owner that these items have plain store
 * links. Items added with a plain link later still get a reminder.
 */
export async function hidePlainLinkReminders(registryId: string, itemIds: string[]) {
  const { user, error: authError } = await requireManager(registryId);
  if (authError || !user) return { error: authError || "Not authenticated" };

  // Server actions can be called directly, so check the input here too.
  if (!Array.isArray(itemIds) || itemIds.length === 0 || itemIds.length > 500 || !itemIds.every(isUuid)) {
    return { error: "Invalid items" };
  }

  const supabase = await createClient();
  const [{ data: registry }, { data: items }] = await Promise.all([
    supabase.from("registries").select("settings").eq("id", registryId).single(),
    supabase.from("registry_items").select("id").eq("registry_id", registryId),
  ]);

  if (!registry) {
    return { error: "Registry not found" };
  }

  // Only items still on the registry, so the list doesn't keep growing.
  const onRegistry = new Set((items ?? []).map((i) => i.id as string));
  const settings = (registry.settings as Record<string, unknown>) || {};
  settings.hidden_plain_link_items = [
    ...new Set([...parseHiddenPlainLinkItems(settings), ...itemIds]),
  ].filter((id) => onRegistry.has(id));

  const { error } = await supabase
    .from("registries")
    .update({ settings })
    .eq("id", registryId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/registry/${registryId}`);
  return { success: true };
}

export async function updateZipCode(
  registryId: string,
  formData: FormData
) {
  const { user, error: authError } = await requireManager(registryId);
  if (authError || !user) return { error: authError || "Not authenticated" };

  const supabase = await createClient();
  const zipCode = (formData.get("zipCode") as string)?.trim() || undefined;
  const taxEnabled = formData.get("taxEnabled") === "true";

  const { data: registry } = await supabase
    .from("registries")
    .select("settings")
    .eq("id", registryId)
    .single();

  if (!registry) {
    return { error: "Registry not found" };
  }

  const settings = (registry.settings as Record<string, unknown>) || {};
  settings.zip_code = zipCode || null;
  settings.tax_enabled = taxEnabled;

  const { error } = await supabase
    .from("registries")
    .update({ settings })
    .eq("id", registryId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/registry/${registryId}`);
  revalidatePath(`/dashboard/registry/${registryId}/settings`);
  return { success: true };
}

export async function toggleChecklistDismissed(
  registryId: string,
  itemName: string,
  dismissed: boolean
) {
  const { user, error: authError } = await requireManager(registryId);
  if (authError || !user) return { error: authError || "Not authenticated" };

  const supabase = await createClient();
  const { data: registry } = await supabase
    .from("registries")
    .select("settings")
    .eq("id", registryId)
    .single();

  if (!registry) {
    return { error: "Registry not found" };
  }

  const settings = (registry.settings as Record<string, unknown>) || {};
  const current = (settings.checklist_dismissed as string[]) || [];
  const lower = itemName.toLowerCase();

  if (dismissed) {
    if (!current.includes(lower)) {
      current.push(lower);
    }
  } else {
    const idx = current.indexOf(lower);
    if (idx !== -1) current.splice(idx, 1);
  }

  settings.checklist_dismissed = current;

  const { error } = await supabase
    .from("registries")
    .update({ settings })
    .eq("id", registryId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/registry/${registryId}`);
  revalidatePath(`/dashboard/registry/${registryId}/checklist`);
  return { success: true };
}

export async function toggleParentPurchased(
  itemId: string,
  registryId: string,
  purchased: boolean
) {
  const { user, error: authError } = await requireManager(registryId);
  if (authError || !user) return { error: authError || "Not authenticated" };

  const supabase = await createClient();
  const { data: item } = await supabase
    .from("registry_items")
    .select("id, quantity_needed, registry_id")
    .eq("id", itemId)
    .single();

  if (!item) {
    return { error: "Item not found" };
  }

  const { error } = await supabase
    .from("registry_items")
    .update({
      is_parent_purchased: purchased,
      quantity_fulfilled: purchased ? item.quantity_needed : 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", itemId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/registry/${registryId}`);
  return { success: true };
}

export async function cancelReservation(
  purchaseId: string,
  registryId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase.rpc("cancel_reservation", {
    p_purchase_id: purchaseId,
    p_owner_id: user.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/registry/${registryId}`);
  return { success: true };
}

export async function contributeToCashFund(formData: FormData) {
  const supabase = await createClient();

  const fundId = formData.get("fundId") as string;
  const amount = parseFloat(formData.get("amount") as string);
  const buyerName = formData.get("buyerName") as string;
  const buyerEmail = formData.get("buyerEmail") as string;
  const message = formData.get("message") as string;

  // Ensure the gift giver has at least an anonymous session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    await supabase.auth.signInAnonymously();
  }

  const { data, error } = await supabase.rpc("reserve_cash_fund", {
    p_fund_id: fundId,
    p_buyer_name: buyerName,
    p_amount: amount,
    p_buyer_email: buyerEmail,
    p_message: message || null,
  });

  if (error) {
    return { error: error.message };
  }

  await addToMyGiftsCookie("funds", fundId, amount);

  // Send email notifications after the response
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  after(async () => {
    try {
      const [{ data: fund }, registryInfo] = await Promise.all([
        supabaseAdmin
          .from("cash_funds")
          .select("title")
          .eq("id", fundId)
          .single(),
        getRegistryInfoForBuyer({ fundId }),
      ]);
      if (fund) {
        await notifyCashFundContribution({
          fundId,
          fundTitle: fund.title,
          buyerName,
          amount,
          message: message || null,
        });
        if (buyerEmail && registryInfo) {
          const registryUrl = buildBuyerRegistryUrl({ siteUrl, slug: registryInfo.slug, buyerEmail });
          await confirmCashFundContribution({
            buyerEmail,
            buyerName,
            fundTitle: fund.title,
            amount,
            parentName: registryInfo.parentName,
            registryTitle: registryInfo.registryTitle,
            paymentMethods: registryInfo.paymentMethods,
            registryUrl,
          });
        }
      }
    } catch (err) {
      console.error("[email] Failed to send fund contribution emails:", err);
    }
  });

  return { success: true, purchaseId: data };
}

export async function suggestItem(formData: FormData) {
  const supabase = await createClient();

  const registryId = formData.get("registryId") as string;
  const title = formData.get("title") as string;
  const externalUrl = formData.get("externalUrl") as string;
  const price = formData.get("price") as string;
  const notes = formData.get("notes") as string;
  const suggestedByName = formData.get("suggestedByName") as string;
  const suggestedByEmail = formData.get("suggestedByEmail") as string;

  // Ensure the guest has at least an anonymous session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    await supabase.auth.signInAnonymously();
  }

  const { error } = await supabase.from("suggestions").insert({
    registry_id: registryId,
    title,
    external_url: externalUrl || null,
    price: price ? parseFloat(price) : null,
    notes: notes || null,
    suggested_by_name: suggestedByName,
    suggested_by_email: suggestedByEmail || null,
  });

  if (error) {
    return { error: error.message };
  }

  // Send email notification after the response
  after(async () => {
    try {
      await notifyNewSuggestion({
        registryId,
        title,
        suggestedByName,
        price: price ? parseFloat(price) : null,
        notes: notes || null,
      });
    } catch (err) {
      console.error("[email] Failed to send suggestion notification:", err);
    }
  });

  return { success: true };
}

export type CoverItemResult = { error: string } | { success: true; purchaseId: string };

/**
 * A guest gives an item the owners already bought by sending them its price in
 * Venmo, PayPal or Zelle, then saying so here. Nothing ships and paying takes
 * seconds, so there's no reservation or hold: the gift is saved as given
 * straight away. The guest's email has a link to undo it.
 */
export async function coverParentPurchasedItem(formData: FormData): Promise<CoverItemResult> {
  const supabase = await createClient();

  const itemId = formData.get("itemId") as string;
  const quantity = parseInt(formData.get("quantity") as string, 10) || 1;
  const buyerName = String(formData.get("buyerName") ?? "").trim();
  const buyerEmail = String(formData.get("buyerEmail") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!isUuid(itemId)) return { error: "This item isn't on the registry anymore." };
  if (!buyerName || !buyerEmail) return { error: "Add your name and email." };
  if (quantity < 1) return { error: "Choose how many you're giving." };

  // Production's cover_parent_item doesn't check how many are left (008 never
  // ran there), so check here. Filtered by the item id.
  const [{ data: item }, { data: covers }] = await Promise.all([
    supabaseAdmin
      .from("registry_items")
      .select("quantity_needed, is_parent_purchased")
      .eq("id", itemId)
      .single(),
    supabaseAdmin
      .from("purchases")
      .select("quantity")
      .eq("registry_item_id", itemId)
      .neq("status", "cancelled"),
  ]);
  if (!item) return { error: "This item isn't on the registry anymore." };
  if (!item.is_parent_purchased) return { error: "This item changed. Reload the page to see how to give it." };
  const given = (covers ?? []).reduce((sum, p) => sum + (p.quantity || 1), 0);
  const available = item.quantity_needed - given;
  if (quantity > available) {
    return {
      error: available > 0 ? `Only ${available} left to gift.` : "Other guests have already given this.",
    };
  }

  // Ensure the gift giver has at least an anonymous session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    await supabase.auth.signInAnonymously();
  }

  const { data: purchaseId, error } = await supabase.rpc("cover_parent_item", {
    p_item_id: itemId,
    p_buyer_name: buyerName,
    p_buyer_email: buyerEmail,
    p_quantity: quantity,
    p_message: message || null,
  });

  if (error || !purchaseId) {
    return { error: error?.message ?? "Couldn't save this gift. Try again." };
  }

  // cover_parent_item saves the gift as 'reserved', which for a gift with no
  // end date already counts as given. Mark it purchased so its status says so.
  const { error: confirmError } = await supabaseAdmin.rpc("confirm_registry_gift", {
    p_purchase_id: purchaseId,
  });
  if (confirmError) console.error("[gifts] Failed to mark a cover gift as purchased:", confirmError);

  // The purchase id is what lets this guest see and undo their gift later.
  await addToMyGiftsCookie("items", itemId, purchaseId);

  after(async () => {
    try {
      await sendCoverGiftEmails(purchaseId);
    } catch (err) {
      console.error("[email] Failed to send cover gift emails:", err);
    }
  });

  const registryInfo = await getRegistryInfoForBuyer({ itemId }).catch(() => null);
  if (registryInfo) revalidatePath(`/r/${registryInfo.slug}`);

  return { success: true, purchaseId };
}

export async function acceptSuggestion(formData: FormData) {
  const supabase = await createClient();
  const suggestionId = formData.get("suggestionId") as string;
  const registryId = formData.get("registryId") as string;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Fetch the suggestion
  const { data: suggestion, error: fetchError } = await supabase
    .from("suggestions")
    .select("*")
    .eq("id", suggestionId)
    .single();

  if (fetchError || !suggestion) {
    return { error: "Suggestion not found" };
  }

  // Add item to registry
  const { error: insertError } = await supabase.from("registry_items").insert({
    registry_id: registryId,
    title: suggestion.title,
    external_url: suggestion.external_url,
    price: suggestion.price,
    notes: suggestion.notes,
    quantity_needed: 1,
  });

  if (insertError) {
    return { error: insertError.message };
  }

  // Update suggestion status
  const { error: updateError } = await supabase
    .from("suggestions")
    .update({ status: "added" })
    .eq("id", suggestionId);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath(`/dashboard/registry/${registryId}`);
  return { success: true };
}

export async function acceptOffering(formData: FormData) {
  const supabase = await createClient();
  const suggestionId = formData.get("suggestionId") as string;
  const registryId = formData.get("registryId") as string;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("suggestions")
    .update({ status: "accepted" })
    .eq("id", suggestionId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/registry/${registryId}`);
  return { success: true };
}

export async function declineSuggestion(formData: FormData) {
  const supabase = await createClient();
  const suggestionId = formData.get("suggestionId") as string;
  const registryId = formData.get("registryId") as string;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("suggestions")
    .update({ status: "declined" })
    .eq("id", suggestionId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/registry/${registryId}`);
  return { success: true };
}

// ============================================================================
// Manager & Invite Actions
// ============================================================================

export async function inviteManagerByEmail(registryId: string, email: string) {
  const { user, role, error: authError } = await requireManager(registryId);
  if (authError || !user) return { error: authError || "Not authenticated" };

  const token = crypto.randomBytes(24).toString("hex");

  const { error } = await supabaseAdmin.from("registry_invites").insert({
    registry_id: registryId,
    invited_by: user.id,
    email: email.toLowerCase().trim(),
    token,
    max_uses: 1,
  });

  if (error) {
    return { error: error.message };
  }

  // Get registry info for the email
  const { data: registry } = await supabaseAdmin
    .from("registries")
    .select("title, parent_names, honoree_names")
    .eq("id", registryId)
    .single();

  after(async () => {
    try {
      await sendManagerInvite({
        toEmail: email.toLowerCase().trim(),
        inviterName:
          registry?.honoree_names || registry?.parent_names || "Someone",
        registryTitle: registry?.title || "a registry",
        token,
      });
    } catch (err) {
      console.error("[email] Failed to send manager invite:", err);
    }
  });

  revalidatePath(`/dashboard/registry/${registryId}/settings`);
  return { success: true };
}

export async function generateInviteLink(registryId: string, maxUses: number | null) {
  const { user, error: authError } = await requireManager(registryId);
  if (authError || !user) return { error: authError || "Not authenticated" };

  const token = crypto.randomBytes(24).toString("hex");

  const { error } = await supabaseAdmin.from("registry_invites").insert({
    registry_id: registryId,
    invited_by: user.id,
    token,
    max_uses: maxUses,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/registry/${registryId}/settings`);
  return { success: true, token };
}

export async function acceptInvite(token: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Not authenticated" };
  }

  const { data, error } = await supabase.rpc("accept_registry_invite", {
    p_token: token,
    p_user_id: user.id,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: true, managerId: data };
}

export async function removeManager(registryId: string, managerId: string) {
  const { user, role, error: authError } = await requireManager(registryId);
  if (authError || !user) return { error: authError || "Not authenticated" };

  if (role !== "owner") {
    return { error: "Only the registry owner can remove managers" };
  }

  // Don't allow removing the owner
  const { data: target } = await supabaseAdmin
    .from("registry_managers")
    .select("role")
    .eq("id", managerId)
    .eq("registry_id", registryId)
    .single();

  if (!target) return { error: "Manager not found" };
  if (target.role === "owner") return { error: "Cannot remove the registry owner" };

  const { error } = await supabaseAdmin
    .from("registry_managers")
    .delete()
    .eq("id", managerId)
    .eq("registry_id", registryId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/registry/${registryId}/settings`);
  return { success: true };
}

export async function revokeInvite(inviteId: string, registryId: string) {
  const { user, role, error: authError } = await requireManager(registryId);
  if (authError || !user) return { error: authError || "Not authenticated" };

  if (role !== "owner") {
    return { error: "Only the registry owner can revoke invites" };
  }

  const { error } = await supabaseAdmin
    .from("registry_invites")
    .delete()
    .eq("id", inviteId)
    .eq("registry_id", registryId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/registry/${registryId}/settings`);
  return { success: true };
}

export async function listManagers(registryId: string) {
  const { error: authError } = await requireManager(registryId);
  if (authError) return { error: authError, managers: [] };

  const { data: managers } = await supabaseAdmin
    .from("registry_managers")
    .select("id, user_id, role, created_at")
    .eq("registry_id", registryId)
    .order("created_at");

  if (!managers) return { error: null, managers: [] };

  // Fetch profile and email info for each manager
  const enriched = await Promise.all(
    managers.map(async (m) => {
      const [{ data: profile }, { data: userData }] = await Promise.all([
        supabaseAdmin.from("profiles").select("full_name").eq("id", m.user_id).single(),
        supabaseAdmin.auth.admin.getUserById(m.user_id),
      ]);
      return {
        id: m.id,
        userId: m.user_id,
        role: m.role,
        name: profile?.full_name || "Unknown",
        email: userData?.user?.email || "",
        createdAt: m.created_at,
      };
    })
  );

  return { error: null, managers: enriched };
}

export async function listInvites(registryId: string) {
  const { error: authError } = await requireManager(registryId);
  if (authError) return { error: authError, invites: [] };

  const { data: invites } = await supabaseAdmin
    .from("registry_invites")
    .select("id, email, max_uses, use_count, expires_at, created_at")
    .eq("registry_id", registryId)
    .order("created_at", { ascending: false });

  return { error: null, invites: invites || [] };
}

/**
 * Sets or clears the registry's photo, which the public registry page shows
 * in its header. The browser uploads the file first (uploadRegistryPhoto) and
 * passes its URL here.
 */
export async function updateRegistryPhoto(registryId: string, photoUrl: string | null) {
  const { user, error: authError } = await requireManager(registryId);
  if (authError || !user) return { error: authError || "Not authenticated" };

  // Only photos in this registry's upload folder, so the header can't be
  // pointed at any image on the web.
  if (photoUrl !== null && !photoUrl.startsWith(registryPhotoUrlPrefix(registryId))) {
    return { error: "That photo wasn't uploaded to this registry. Upload it again." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("registries")
    .update({ photo_url: photoUrl })
    .eq("id", registryId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/registry/${registryId}`);
  return { success: true };
}
