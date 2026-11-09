// Profile links look like /u/jane-doe-k7m2p9qx4t. Only the id at the end is
// looked up. The name part is there to read, so a link keeps working after the
// person changes their name, and the profile page redirects to the current one.

// Mirrors profiles_public_id_format in
// supabase/migrations/015_profile_links_and_email_search.sql.
const PUBLIC_ID_PATTERN = /^[a-kmnp-z2-9]{10}$/;

export interface ProfileRef {
  public_id: string;
  full_name: string | null;
}

/** The name to show for someone. Sign-up asks for one, so the fallback is rare. */
export function displayName(person: { full_name: string | null }): string {
  return person.full_name?.trim() || "Regibee member";
}

function nameSlug(fullName: string | null): string {
  return (fullName ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // drop accents: "José" → "jose"
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
}

export function profilePath(person: ProfileRef): string {
  const slug = nameSlug(person.full_name);
  return `/u/${slug ? `${slug}-` : ""}${person.public_id}`;
}

export function isValidPublicId(value: string): boolean {
  return PUBLIC_ID_PATTERN.test(value);
}

/** The id from the last part of a /u/ link, or null if it doesn't have one. */
export function publicIdFromPath(segment: string): string | null {
  const last = segment.toLowerCase().split("-").pop() ?? "";
  return isValidPublicId(last) ? last : null;
}
