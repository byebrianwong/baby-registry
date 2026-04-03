import crypto from "crypto";

/**
 * HMAC-signed links for buyer "View Registry" emails.
 *
 * The signature proves the email address is authentic — nobody can craft a link
 * to see someone else's purchases. The HMAC key is the server-only
 * SUPABASE_SERVICE_ROLE_KEY (always available on the server).
 */

function getSecret(): string {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for buyer link signing");
  return secret;
}

/** Sign an email + slug pair and return the hex signature. */
export function signBuyerLink(email: string, slug: string): string {
  return crypto
    .createHmac("sha256", getSecret())
    .update(`${email.toLowerCase()}:${slug}`)
    .digest("hex")
    .slice(0, 16); // 16 hex chars = 64 bits, plenty for a non-secret URL token
}

/** Build a full signed registry URL for a buyer. */
export function buildBuyerRegistryUrl(opts: {
  siteUrl: string;
  slug: string;
  buyerEmail: string;
}): string {
  const sig = signBuyerLink(opts.buyerEmail, opts.slug);
  const params = new URLSearchParams({
    email: opts.buyerEmail.toLowerCase(),
    sig,
  });
  return `${opts.siteUrl}/r/${opts.slug}?${params}`;
}

/** Verify that a signature is valid for the given email + slug. */
export function verifyBuyerLink(email: string, slug: string, sig: string): boolean {
  const expected = signBuyerLink(email, slug);
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}
