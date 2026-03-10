"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  notifyItemReserved,
  notifyCashFundContribution,
  notifyItemCovered,
  notifyNewSuggestion,
} from "@/lib/email";
import { supabaseAdmin } from "@/lib/supabase-admin";

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
  const isPublic = formData.get("isPublic") === "true";

  const { error } = await supabase
    .from("registries")
    .update({
      title,
      event_date: eventDate || null,
      description: description || null,
      is_public: isPublic,
    })
    .eq("id", registryId)
    .eq("owner_id", user.id);

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

  // Fire-and-forget email notification
  supabaseAdmin
    .from("registry_items")
    .select("title")
    .eq("id", itemId)
    .single()
    .then(({ data: item }) => {
      if (item) {
        void notifyItemReserved({
          itemId,
          itemTitle: item.title,
          buyerName,
          quantity,
          message: message || null,
        });
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const venmo = (formData.get("venmo") as string)?.trim() || undefined;
  const paypal = (formData.get("paypal") as string)?.trim() || undefined;
  const zelle = (formData.get("zelle") as string)?.trim() || undefined;

  // Read existing settings first to merge
  const { data: registry } = await supabase
    .from("registries")
    .select("settings")
    .eq("id", registryId)
    .eq("owner_id", user.id)
    .single();

  if (!registry) {
    return { error: "Registry not found" };
  }

  const settings = (registry.settings as Record<string, unknown>) || {};
  settings.payment_methods = { venmo, paypal, zelle };

  const { error } = await supabase
    .from("registries")
    .update({ settings })
    .eq("id", registryId)
    .eq("owner_id", user.id);

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const zipCode = (formData.get("zipCode") as string)?.trim() || undefined;
  const taxEnabled = formData.get("taxEnabled") === "true";

  const { data: registry } = await supabase
    .from("registries")
    .select("settings")
    .eq("id", registryId)
    .eq("owner_id", user.id)
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
    .eq("id", registryId)
    .eq("owner_id", user.id);

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: registry } = await supabase
    .from("registries")
    .select("settings")
    .eq("id", registryId)
    .eq("owner_id", user.id)
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
    .eq("id", registryId)
    .eq("owner_id", user.id);

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  console.log(`[toggleParentPurchased] itemId=${itemId}, purchased=${purchased}`);

  // Verify ownership
  const { data: item } = await supabase
    .from("registry_items")
    .select("id, quantity_needed, registry_id")
    .eq("id", itemId)
    .single();

  if (!item) {
    console.log(`[toggleParentPurchased] Item not found`);
    return { error: "Item not found" };
  }
  console.log(`[toggleParentPurchased] Found item, registry_id=${item.registry_id}`);

  const { data: registry } = await supabase
    .from("registries")
    .select("id")
    .eq("id", item.registry_id)
    .eq("owner_id", user.id)
    .single();

  if (!registry) {
    console.log(`[toggleParentPurchased] Not authorized`);
    return { error: "Not authorized" };
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
    console.log(`[toggleParentPurchased] Update error: ${error.message}`);
    return { error: error.message };
  }
  console.log(`[toggleParentPurchased] Success`);

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

  // Fire-and-forget email notification
  supabaseAdmin
    .from("cash_funds")
    .select("title")
    .eq("id", fundId)
    .single()
    .then(({ data: fund }) => {
      if (fund) {
        void notifyCashFundContribution({
          fundId,
          fundTitle: fund.title,
          buyerName,
          amount,
          message: message || null,
        });
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

  // Fire-and-forget email notification
  supabaseAdmin
    .from("registry_items")
    .select("title")
    .eq("id", itemId)
    .single()
    .then(({ data: item }) => {
      if (item) {
        void notifyItemCovered({
          itemId,
          itemTitle: item.title,
          buyerName,
          message: message || null,
        });
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
