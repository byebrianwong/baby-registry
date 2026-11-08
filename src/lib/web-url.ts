/**
 * Turns what someone typed in a URL field into a web address that's safe to
 * open, adding https:// when they left it off. Returns null when it isn't a
 * web address, like "crib" or an empty field.
 */
export function toWebUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
    // Require a dot in the host, so a word like "crib" doesn't open https://crib/.
    if (!url.hostname.includes(".")) return null;
    return url.href;
  } catch {
    return null;
  }
}
