// Mirrors the profiles_username_format check in
// supabase/migrations/011_public_profiles.sql.
const USERNAME_PATTERN = /^[a-z0-9][a-z0-9-]{1,28}[a-z0-9]$/;

// Names that could pass as Regibee itself, or as a page or mailbox of ours.
const RESERVED_USERNAMES = new Set([
  "abuse",
  "about",
  "account",
  "admin",
  "administrator",
  "api",
  "contact",
  "dashboard",
  "demo",
  "help",
  "info",
  "login",
  "mod",
  "moderator",
  "no-reply",
  "noreply",
  "null",
  "official",
  "postmaster",
  "regibee",
  "root",
  "security",
  "settings",
  "signup",
  "staff",
  "support",
  "system",
  "team",
  "undefined",
]);

export function normalizeUsername(raw: string): string {
  return raw.trim().replace(/^@/, "").toLowerCase();
}

export function isValidUsernameFormat(username: string): boolean {
  return USERNAME_PATTERN.test(username);
}

/**
 * A starting suggestion made from someone's name, such as "Jane & John Doe" →
 * "jane-john-doe". Returns "" when the name doesn't make a valid username. It
 * may still be taken, which saving reports.
 */
export function suggestUsername(fullName: string): string {
  const slug = fullName
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // drop accents: "José" → "jose"
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/, "");
  return usernameProblem(slug) ? "" : slug;
}

export function usernameProblem(username: string): string | null {
  if (!isValidUsernameFormat(username)) {
    return "Usernames need 3-30 letters, numbers or hyphens, and can't start or end with a hyphen.";
  }
  if (RESERVED_USERNAMES.has(username)) {
    return "That username isn't available.";
  }
  return null;
}
