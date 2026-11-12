import type { SupabaseClient } from "@supabase/supabase-js";
import type { PersonalEventType, RegistryType } from "@/lib/types";

// Making a registry row, shared by the registry form (createRegistry in
// src/lib/actions/registry.ts), the "What are you planning?" picker and an
// honoree's list request (src/lib/actions/events.ts). Server code only: the
// callers check who's signed in first.

/** The categories a new baby registry starts with. Personal lists start with none. */
export const BABY_DEFAULT_CATEGORIES = [
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

/** A registry's share link slug: its title plus a few random letters. */
export function generateRegistrySlug(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") +
    "-" +
    Math.random().toString(36).substring(2, 8)
  );
}

export interface NewRegistry {
  ownerId: string;
  title: string;
  registryType: RegistryType;
  /** Only for personal registries. */
  eventType: PersonalEventType | null;
  eventDate?: string | null;
  description?: string | null;
  honoreeNames?: string | null;
  isPublic?: boolean;
  listedOnProfile?: boolean;
  settings?: Record<string, unknown> | null;
}

/**
 * Inserts a registry, and a baby registry's starting categories. A database
 * trigger adds the owner as its first manager.
 */
export async function insertRegistry(
  client: SupabaseClient,
  registry: NewRegistry,
): Promise<{ id: string; slug: string; title: string } | { error: string }> {
  const { data, error } = await client
    .from("registries")
    .insert({
      owner_id: registry.ownerId,
      title: registry.title,
      slug: generateRegistrySlug(registry.title),
      event_date: registry.eventDate || null,
      description: registry.description || null,
      honoree_names: registry.honoreeNames || null,
      is_public: registry.isPublic ?? true,
      listed_on_profile: registry.listedOnProfile ?? false,
      registry_type: registry.registryType,
      event_type: registry.registryType === "personal" ? registry.eventType : null,
      settings: registry.settings && Object.keys(registry.settings).length > 0 ? registry.settings : null,
    })
    .select("id, slug, title")
    .single();
  if (error || !data) return { error: error?.message ?? "The registry wasn't made. Try again." };

  if (registry.registryType === "baby") {
    await client.from("categories").insert(
      BABY_DEFAULT_CATEGORIES.map((name, index) => ({ registry_id: data.id, name, sort_order: index })),
    );
  }
  return data;
}
