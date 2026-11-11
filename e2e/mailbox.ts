// Reads the emails the site sent, from Mailpit's API. The site sends most
// emails after it has answered the request, so waitForEmail waits for them.

import { localSupabase } from "./local-supabase";

interface MailpitAddress {
  Name: string;
  Address: string;
}

interface MailpitSummary {
  ID: string;
  Subject: string;
  To: MailpitAddress[];
}

export interface ReceivedEmail {
  id: string;
  subject: string;
  from: string;
  to: string[];
  replyTo: string[];
  html: string;
  /** Every href in the email, with HTML entities decoded. */
  links: string[];
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function api<T>(apiPath: string): Promise<T> {
  const response = await fetch(`${localSupabase().mailpitUrl}/api/v1/${apiPath}`);
  if (!response.ok) throw new Error(`Mailpit ${apiPath}: ${response.status}`);
  return response.json() as Promise<T>;
}

async function fetchEmail(id: string): Promise<ReceivedEmail> {
  const message = await api<{
    ID: string;
    Subject: string;
    From: MailpitAddress;
    To: MailpitAddress[];
    ReplyTo: MailpitAddress[] | null;
    HTML: string;
  }>(`message/${id}`);
  return {
    id: message.ID,
    subject: message.Subject,
    from: message.From.Name ? `${message.From.Name} <${message.From.Address}>` : message.From.Address,
    to: message.To.map((to) => to.Address),
    replyTo: (message.ReplyTo ?? []).map((to) => to.Address),
    html: message.HTML,
    links: [...message.HTML.matchAll(/href="([^"]*)"/g)].map((match) => decodeEntities(match[1])),
  };
}

/** Every email sent to this address, newest first. */
export async function emailsTo(address: string): Promise<ReceivedEmail[]> {
  const query = encodeURIComponent(`to:"${address}"`);
  const { messages } = await api<{ messages: MailpitSummary[] }>(`search?query=${query}&limit=50`);
  // Search matches part of an address, so keep exact matches only.
  const exact = messages.filter((m) => m.To.some((to) => to.Address.toLowerCase() === address.toLowerCase()));
  return Promise.all(exact.map((m) => fetchEmail(m.ID)));
}

/** Waits for an email to this address whose subject matches, and returns it. */
export async function waitForEmail(
  to: string,
  subject: string | RegExp,
  { timeout = 20_000 } = {}
): Promise<ReceivedEmail> {
  const matches = (s: string) => (typeof subject === "string" ? s === subject : subject.test(s));
  const deadline = Date.now() + timeout;
  let seen: string[] = [];
  while (Date.now() < deadline) {
    const emails = await emailsTo(to);
    const found = emails.find((email) => matches(email.subject));
    if (found) return found;
    seen = emails.map((email) => email.subject);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(
    `No email to ${to} with subject ${String(subject)} within ${timeout} ms.` +
      (seen.length ? ` It got: ${seen.map((s) => JSON.stringify(s)).join(", ")}` : " It got none.")
  );
}

/** The one link in the email that matches. */
export function linkIn(email: ReceivedEmail, pattern: RegExp): string {
  const found = email.links.filter((link) => pattern.test(link));
  if (found.length === 0) {
    throw new Error(`No link matching ${pattern} in "${email.subject}". Links: ${email.links.join(", ")}`);
  }
  return found[0];
}
