const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const wholeCurrency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function formatPrice(value: number | null | undefined) {
  return value == null ? "" : currency.format(value);
}

export function formatDollars(value: number) {
  return wholeCurrency.format(value);
}

/** Parses what someone typed in a price field: "$1,299.99" → 1299.99. */
export function parsePrice(text: string): number | null {
  const match = text.replace(/,/g, "").match(/\d+(?:\.\d{0,2})?/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Dates are stored as YYYY-MM-DD. Reads one as a local calendar date. */
function localDate(ymd: string) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function formatEventDate(ymd: string | null) {
  if (!ymd) return null;
  return localDate(ymd).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

/** "In 23 days", "Tomorrow", "Today", "3 weeks ago". */
export function relativeDay(ymd: string | null) {
  if (!ymd) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.round((localDate(ymd).getTime() - today.getTime()) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  if (days === -1) return "Yesterday";
  if (days > 1 && days < 14) return `In ${days} days`;
  if (days >= 14 && days < 60) return `In ${Math.round(days / 7)} weeks`;
  if (days >= 60) return `In ${Math.round(days / 30)} months`;
  if (days < -1 && days > -14) return `${-days} days ago`;
  return formatEventDate(ymd);
}

/** "Just now", "5m", "3h", "2d", or a date, for gift activity. */
export function timeAgo(iso: string) {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 7 * 86_400) return `${Math.floor(seconds / 86_400)}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

export function plural(count: number, one: string, many = `${one}s`) {
  return `${count} ${count === 1 ? one : many}`;
}
