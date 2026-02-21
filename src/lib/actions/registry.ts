"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

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
  const slug = generateSlug(title);

  const { data: registry, error } = await supabase
    .from("registries")
    .insert({
      owner_id: user.id,
      title,
      slug,
      event_date: eventDate || null,
      description: description || null,
      is_public: true,
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
  const notes = formData.get("notes") as string;

  const { error } = await supabase.from("registry_items").insert({
    registry_id: registryId,
    category_id: categoryId || null,
    title,
    external_url: externalUrl || null,
    image_url: imageUrl || null,
    price: price ? parseFloat(price) : null,
    quantity_needed: quantityNeeded ? parseInt(quantityNeeded) : 1,
    is_essential: isEssential,
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

  return { success: true, purchaseId: data };
}
