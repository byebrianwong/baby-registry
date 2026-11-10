// Links that open a payment app with the amount, and a note where the app
// takes one, already filled in. Owners type their handles freely in registry
// settings, so each builder returns null when it can't tell the handle apart
// from an email or phone number. The guest then copies the handle instead.
//
// Both formats were checked on 2026-11-10:
// - Venmo: https://venmo.com/<user>?txn=pay&amount=74.00&note=<text>
//   redirects to account.venmo.com/payment-link, which says "Sign in to pay
//   <name> $74.00" and shows the note. On phones it opens the Venmo app. Venmo
//   warns payers about links in notes, so a note is plain text only.
// - PayPal.Me: https://paypal.me/<user>/74.00USD fills in $74.00. Without the
//   currency code, PayPal uses the recipient's own currency. PayPal.Me takes
//   no note.
// Zelle has no public link format.

/** Venmo usernames are 5 to 30 letters, digits, hyphens and underscores. */
const VENMO_USERNAME = /^[A-Za-z0-9_-]{5,30}$/;

/** PayPal.Me names are up to 20 letters and digits. */
const PAYPAL_ME_NAME = /^[A-Za-z0-9]{1,20}$/;

/** "@remi-and-max", "remi-and-max" or a venmo.com profile link → "remi-and-max". */
export function venmoUsername(handle: string | undefined): string | null {
  const value = handle?.trim();
  if (!value) return null;
  const fromUrl = value.match(/venmo\.com\/(?:u\/)?([^/?#\s]+)/i);
  const name = (fromUrl ? fromUrl[1] : value).replace(/^@/, "");
  return VENMO_USERNAME.test(name) ? name : null;
}

/** "paypal.me/remiandmax", a paypal.com/paypalme link or a bare name → "remiandmax". Emails → null. */
export function paypalMeName(handle: string | undefined): string | null {
  const value = handle?.trim();
  if (!value) return null;
  const fromUrl = value.match(/paypal\.me\/([^/?#\s]+)/i) ?? value.match(/paypal\.com\/paypalme\/([^/?#\s]+)/i);
  const name = (fromUrl ? fromUrl[1] : value).replace(/^@/, "");
  return PAYPAL_ME_NAME.test(name) ? name : null;
}

function amountParam(amount: number | null | undefined): string | null {
  return amount != null && Number.isFinite(amount) && amount > 0 ? amount.toFixed(2) : null;
}

/** The note a payment carries: plain text, short enough for any app. */
export function paymentNote(itemTitle: string, quantity = 1): string {
  const note = `Gift: ${itemTitle}${quantity > 1 ? ` (×${quantity})` : ""}`;
  return note.length > 80 ? `${note.slice(0, 79)}…` : note;
}

export function venmoPayUrl(opts: {
  handle: string | undefined;
  amount?: number | null;
  note?: string;
}): string | null {
  const user = venmoUsername(opts.handle);
  if (!user) return null;
  const params = new URLSearchParams({ txn: "pay" });
  const amount = amountParam(opts.amount);
  if (amount) params.set("amount", amount);
  if (opts.note) params.set("note", opts.note);
  return `https://venmo.com/${encodeURIComponent(user)}?${params.toString()}`;
}

export function paypalPayUrl(opts: { handle: string | undefined; amount?: number | null }): string | null {
  const name = paypalMeName(opts.handle);
  if (!name) return null;
  const amount = amountParam(opts.amount);
  return amount ? `https://paypal.me/${name}/${amount}USD` : `https://paypal.me/${name}`;
}
