// The gifts cookie remembers what this browser gave: purchase ids by item id,
// and amounts by cash fund id. The public registry page reads it to show a
// guest their own gifts. It's readable and editable in the browser, so the
// page trusts an item entry only when it holds a live purchase id for that
// item. Purchase ids never appear in public page data.

export const MY_GIFTS_COOKIE = "regibee_my_gifts";

export const MY_GIFTS_COOKIE_OPTIONS = {
  path: "/",
  maxAge: 60 * 60 * 24 * 365, // 1 year
  sameSite: "lax" as const,
  httpOnly: false,
};

export interface MyGiftsCookie {
  items?: Record<string, string>;
  funds?: Record<string, number>;
}

export function parseMyGiftsCookie(raw: string | undefined): MyGiftsCookie {
  if (!raw) return {};
  try {
    const data = JSON.parse(raw);
    return data && typeof data === "object" ? (data as MyGiftsCookie) : {};
  } catch {
    return {};
  }
}

/** The cookie's value with one gift added or replaced. */
export function withGift(
  raw: string | undefined,
  key: "items" | "funds",
  id: string,
  value: string | number
): string {
  const data = parseMyGiftsCookie(raw);
  const entries = { ...(data[key] ?? {}) } as Record<string, string | number>;
  entries[id] = value;
  return JSON.stringify({ ...data, [key]: entries });
}
