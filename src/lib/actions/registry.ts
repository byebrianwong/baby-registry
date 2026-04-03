"use server";

import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  notifyItemReserved,
  notifyCashFundContribution,
  notifyItemCovered,
  notifyNewSuggestion,
  sendManagerInvite,
  confirmItemReserved,
  confirmItemCovered,
  confirmCashFundContribution,
  getRegistryInfoForBuyer,
} from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { buildBuyerRegistryUrl } from "@/lib/buyer-link";
import crypto from "crypto";

const COOKIE_NAME = "regibee_my_gifts";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

async function addToMyGiftsCookie(
  key: "items" | "funds",
  id: string,
  value: string | number
) {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  let data: { items?: Record<string, string>; funds?: Record<string, number> } = {};
  try {
    if (raw) data = JSON.parse(raw);
  } catch {}
  if (!data[key]) data[key] = {} as any;
  (data[key] as any)[id] = value;
  cookieStore.set(COOKIE_NAME, JSON.stringify(data), {
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    sameSite: "lax",
    httpOnly: false,
  });
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
  const zipCode = formData.get("zipCode") as string;
  const taxEnabled = formData.get("taxEnabled") === "true";
  const venmo = formData.get("venmo") as string;
  const paypal = formData.get("paypal") as string;
  const zelle = formData.get("zelle") as string;
  const slug = generateSlug(title);

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
      settings: Object.keys(settings).length > 0 ? settings : null,
    })
    .select()
    .single();

  if (error) {
    return { error: error.message };
  }

  // Seed default categories
  const defaultCategories = [
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

  await supabase.from("categories").insert(
    defaultCategories.map((name, index) => ({
      registry_id: registry.id,
      name,
      sort_order: index,
    }))
  );

  redirect(`/dashboard/registry/${registry.id}`);
}

export async function updateRegistry(registryId: string, formData: FormData) {
  const { user, error: authError } = await requireManager(registryId);
  if (authError || !user) return { error: authError || "Not authenticated" };

  const supabase = await createClient();
  const title = formData.get("title") as string;
  const parentNames = formData.get("parentNames") as string;
  const eventDate = formData.get("eventDate") as string;
  const description = formData.get("description") as string;
  const isPublic = formData.get("isPublic") === "true";

  const { error } = await supabase
    .from("registries")
    .update({
      title,
      parent_names: parentNames || null,
      event_date: eventDate || null,
      description: description || null,
      is_public: isPublic,
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

export async function reserveItem(formData: FormData) {
  const supabase = await createClient();

  const itemId = formData.get("itemId") as string;
  const quantity = parseInt(formData.get("quantity") as string) || 1;
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

  const { data, error } = await supabase.rpc("reserve_registry_item", {
    p_item_id: itemId,
    p_quantity: quantity,
    p_buyer_name: buyerName,
    p_buyer_email: buyerEmail,
    p_message: message || null,
  });

  if (error) {
    return { error: error.message };
  }

  await addToMyGiftsCookie("items", itemId, "reserve");

  // Fire-and-forget email notifications
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  Promise.all([
    supabaseAdmin
      .from("registry_items")
      .select("title, external_url")
      .eq("id", itemId)
      .single(),
    getRegistryInfoForBuyer({ itemId }),
  ]).then(([{ data: item }, registryInfo]) => {
    if (item) {
      void notifyItemReserved({
        itemId,
        itemTitle: item.title,
        buyerName,
        quantity,
        message: message || null,
      });
      if (buyerEmail && registryInfo) {
        const registryUrl = buildBuyerRegistryUrl({ siteUrl, slug: registryInfo.slug, buyerEmail });
        const shopUrl = item.external_url || undefined;
        void confirmItemReserved({
          buyerEmail,
          buyerName,
          itemTitle: item.title,
          quantity,
          parentName: registryInfo.parentName,
          registryTitle: registryInfo.registryTitle,
          shippingAddress: registryInfo.shippingAddress,
          registryUrl,
          shopUrl,
        });
      }
    }
  });

  return { success: true, purchaseId: data };
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

  const { error } = await supabase.from("categories").insert({
    registry_id: registryId,
    name,
    sort_order: nextOrder,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(`/dashboard/registry/${registryId}`);
  return { success: true };
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

  // Fire-and-forget email notifications
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  Promise.all([
    supabaseAdmin
      .from("cash_funds")
      .select("title")
      .eq("id", fundId)
      .single(),
    getRegistryInfoForBuyer({ fundId }),
  ]).then(([{ data: fund }, registryInfo]) => {
    if (fund) {
      void notifyCashFundContribution({
        fundId,
        fundTitle: fund.title,
        buyerName,
        amount,
        message: message || null,
      });
      if (buyerEmail && registryInfo) {
        const registryUrl = buildBuyerRegistryUrl({ siteUrl, slug: registryInfo.slug, buyerEmail });
        void confirmCashFundContribution({
          buyerEmail,
          buyerName,
          fundTitle: fund.title,
          amount,
          parentName: registryInfo.parentName,
          registryTitle: registryInfo.registryTitle,
          shippingAddress: registryInfo.shippingAddress,
          registryUrl,
        });
      }
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

  // Fire-and-forget email notification
  void notifyNewSuggestion({
    registryId,
    title,
    suggestedByName,
    price: price ? parseFloat(price) : null,
    notes: notes || null,
  });

  return { success: true };
}

export async function coverParentPurchasedItem(formData: FormData) {
  const supabase = await createClient();

  const itemId = formData.get("itemId") as string;
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

  const { data, error } = await supabase.rpc("cover_parent_item", {
    p_item_id: itemId,
    p_buyer_name: buyerName,
    p_buyer_email: buyerEmail,
    p_message: message || null,
  });

  if (error) {
    return { error: error.message };
  }

  await addToMyGiftsCookie("items", itemId, "cover");

  // Fire-and-forget email notifications
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  Promise.all([
    supabaseAdmin
      .from("registry_items")
      .select("title, external_url")
      .eq("id", itemId)
      .single(),
    getRegistryInfoForBuyer({ itemId }),
  ]).then(([{ data: item }, registryInfo]) => {
    if (item) {
      void notifyItemCovered({
        itemId,
        itemTitle: item.title,
        buyerName,
        message: message || null,
      });
      if (buyerEmail && registryInfo) {
        const registryUrl = buildBuyerRegistryUrl({ siteUrl, slug: registryInfo.slug, buyerEmail });
        const shopUrl = item.external_url || undefined;
        void confirmItemCovered({
          buyerEmail,
          buyerName,
          itemTitle: item.title,
          parentName: registryInfo.parentName,
          registryTitle: registryInfo.registryTitle,
          shippingAddress: registryInfo.shippingAddress,
          registryUrl,
          shopUrl,
        });
      }
    }
  });

  return { success: true, purchaseId: data };
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
    .select("title, parent_names")
    .eq("id", registryId)
    .single();

  void sendManagerInvite({
    toEmail: email.toLowerCase().trim(),
    inviterName: registry?.parent_names || "Someone",
    registryTitle: registry?.title || "a registry",
    token,
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
