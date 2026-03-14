import { Resend } from "resend";
import { supabaseAdmin } from "./supabase-admin";

let _resend: Resend | null = null;
function getResend() {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM = "Regibee <notifications@regibee.com>";

// Resend's free testing sender can only deliver to the account email.
// Set this env var to override the recipient for testing.
const TEST_RECIPIENT_OVERRIDE = process.env.RESEND_TEST_RECIPIENT;

async function getRegistryOwnerEmail(opts: {
  itemId?: string;
  fundId?: string;
  registryId?: string;
}): Promise<{ email: string; name: string; registryTitle: string; registryId: string } | null> {
  let registryId = opts.registryId;

  if (opts.itemId) {
    const { data } = await supabaseAdmin
      .from("registry_items")
      .select("registry_id")
      .eq("id", opts.itemId)
      .single();
    registryId = data?.registry_id;
  } else if (opts.fundId) {
    const { data } = await supabaseAdmin
      .from("cash_funds")
      .select("registry_id")
      .eq("id", opts.fundId)
      .single();
    registryId = data?.registry_id;
  }

  if (!registryId) return null;

  const { data: registry } = await supabaseAdmin
    .from("registries")
    .select("owner_id, title")
    .eq("id", registryId)
    .single();

  if (!registry) return null;

  const { data: userData } = await supabaseAdmin.auth.admin.getUserById(
    registry.owner_id
  );

  if (!userData?.user?.email) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("display_name")
    .eq("id", registry.owner_id)
    .single();

  return {
    email: userData.user.email,
    name: profile?.display_name || "there",
    registryTitle: registry.title,
    registryId,
  };
}

async function getRegistryInfoForBuyer(opts: {
  itemId?: string;
  fundId?: string;
}): Promise<{ parentName: string; registryTitle: string; shippingAddress?: string; slug: string } | null> {
  let registryId: string | undefined;

  if (opts.itemId) {
    const { data } = await supabaseAdmin
      .from("registry_items")
      .select("registry_id")
      .eq("id", opts.itemId)
      .single();
    registryId = data?.registry_id;
  } else if (opts.fundId) {
    const { data } = await supabaseAdmin
      .from("cash_funds")
      .select("registry_id")
      .eq("id", opts.fundId)
      .single();
    registryId = data?.registry_id;
  }

  if (!registryId) return null;

  const { data: registry } = await supabaseAdmin
    .from("registries")
    .select("owner_id, title, settings, slug")
    .eq("id", registryId)
    .single();

  if (!registry) return null;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("display_name")
    .eq("id", registry.owner_id)
    .single();

  const settings = registry.settings as Record<string, unknown> | null;
  const shippingAddress = (settings?.shipping_address as string) || undefined;

  return {
    parentName: profile?.display_name || "the registry owner",
    registryTitle: registry.title,
    shippingAddress,
    slug: registry.slug,
  };
}

export async function confirmItemReserved(opts: {
  buyerEmail: string;
  buyerName: string;
  itemTitle: string;
  quantity: number;
  parentName: string;
  registryTitle: string;
  shippingAddress?: string;
  registryUrl?: string;
  shopUrl?: string;
}) {
  try {
    const qtyText = opts.quantity > 1 ? ` (×${opts.quantity})` : "";
    const addressBlock = opts.shippingAddress
      ? `<p><strong>Shipping address:</strong><br/>${opts.shippingAddress.replace(/\n/g, "<br/>")}</p>`
      : "";
    const linksBlock = [
      opts.registryUrl ? `<a href="${opts.registryUrl}" style="color:#004659;">View Registry</a>` : "",
      opts.shopUrl ? `<a href="${opts.shopUrl}" style="color:#004659;">Shop This Item</a>` : "",
    ].filter(Boolean).join(" &nbsp;|&nbsp; ");

    await getResend().emails.send({
      from: FROM,
      to: TEST_RECIPIENT_OVERRIDE || opts.buyerEmail,
      subject: `Your gift is confirmed — "${opts.itemTitle}"`,
      html: `
        <p>Hi ${opts.buyerName},</p>
        <p>Thanks for reserving <strong>${opts.itemTitle}</strong>${qtyText} on <em>${opts.registryTitle}</em>!</p>
        <p>${opts.parentName} will really appreciate it.</p>
        ${addressBlock}
        ${linksBlock ? `<p style="margin: 16px 0;">${linksBlock}</p>` : ""}
        <p style="color:#888;font-size:13px;">You're receiving this because you reserved a gift on a Regibee registry.</p>
      `,
    });
  } catch (err) {
    console.error("[email] Failed to send buyer item reserved confirmation:", err);
  }
}

export async function confirmItemCovered(opts: {
  buyerEmail: string;
  buyerName: string;
  itemTitle: string;
  parentName: string;
  registryTitle: string;
  shippingAddress?: string;
  registryUrl?: string;
  shopUrl?: string;
}) {
  try {
    const addressBlock = opts.shippingAddress
      ? `<p><strong>Shipping address:</strong><br/>${opts.shippingAddress.replace(/\n/g, "<br/>")}</p>`
      : "";
    const linksBlock = [
      opts.registryUrl ? `<a href="${opts.registryUrl}" style="color:#004659;">View Registry</a>` : "",
      opts.shopUrl ? `<a href="${opts.shopUrl}" style="color:#004659;">Shop This Item</a>` : "",
    ].filter(Boolean).join(" &nbsp;|&nbsp; ");

    await getResend().emails.send({
      from: FROM,
      to: TEST_RECIPIENT_OVERRIDE || opts.buyerEmail,
      subject: `Your gift is confirmed — "${opts.itemTitle}"`,
      html: `
        <p>Hi ${opts.buyerName},</p>
        <p>Thanks for covering <strong>${opts.itemTitle}</strong> on <em>${opts.registryTitle}</em>!</p>
        <p>${opts.parentName} will really appreciate it.</p>
        ${addressBlock}
        ${linksBlock ? `<p style="margin: 16px 0;">${linksBlock}</p>` : ""}
        <p style="color:#888;font-size:13px;">You're receiving this because you covered a gift on a Regibee registry.</p>
      `,
    });
  } catch (err) {
    console.error("[email] Failed to send buyer item covered confirmation:", err);
  }
}

export async function confirmCashFundContribution(opts: {
  buyerEmail: string;
  buyerName: string;
  fundTitle: string;
  amount: number;
  parentName: string;
  registryTitle: string;
  shippingAddress?: string;
  registryUrl?: string;
}) {
  try {
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(opts.amount);

    const addressBlock = opts.shippingAddress
      ? `<p><strong>Shipping address:</strong><br/>${opts.shippingAddress.replace(/\n/g, "<br/>")}</p>`
      : "";
    const linkBlock = opts.registryUrl
      ? `<p style="margin: 16px 0;"><a href="${opts.registryUrl}" style="color:#004659;">View Registry</a></p>`
      : "";

    await getResend().emails.send({
      from: FROM,
      to: TEST_RECIPIENT_OVERRIDE || opts.buyerEmail,
      subject: `Your contribution is confirmed — "${opts.fundTitle}"`,
      html: `
        <p>Hi ${opts.buyerName},</p>
        <p>Thanks for contributing <strong>${formatted}</strong> to <strong>${opts.fundTitle}</strong> on <em>${opts.registryTitle}</em>!</p>
        <p>${opts.parentName} will really appreciate it.</p>
        ${addressBlock}
        ${linkBlock}
        <p style="color:#888;font-size:13px;">You're receiving this because you contributed to a cash fund on a Regibee registry.</p>
      `,
    });
  } catch (err) {
    console.error("[email] Failed to send buyer cash fund confirmation:", err);
  }
}

export { getRegistryInfoForBuyer };

export async function notifyItemReserved(opts: {
  itemId: string;
  itemTitle: string;
  buyerName: string;
  quantity: number;
  message?: string | null;
}) {
  try {
    const owner = await getRegistryOwnerEmail({ itemId: opts.itemId });
    if (!owner) return;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const dashboardLink = `${siteUrl}/dashboard/registry/${owner.registryId}?highlight=${opts.itemId}`;
    const qtyText = opts.quantity > 1 ? ` (×${opts.quantity})` : "";

    await getResend().emails.send({
      from: FROM,
      to: TEST_RECIPIENT_OVERRIDE || owner.email,
      subject: `🎁 ${opts.buyerName} reserved "${opts.itemTitle}"`,
      html: `
        <p>Hi ${owner.name},</p>
        <p><strong>${opts.buyerName}</strong> just reserved <strong>${opts.itemTitle}</strong>${qtyText} on your registry <em>${owner.registryTitle}</em>.</p>
        ${opts.message ? `<p>Their message: "${opts.message}"</p>` : ""}
        <p style="margin: 16px 0;"><a href="${dashboardLink}" style="color:#004659;">View on Dashboard</a></p>
        <p style="color:#888;font-size:13px;">You're receiving this because someone interacted with your baby registry.</p>
      `,
    });
  } catch (err) {
    console.error("[email] Failed to send item reserved notification:", err);
  }
}

export async function notifyCashFundContribution(opts: {
  fundId: string;
  fundTitle: string;
  buyerName: string;
  amount: number;
  message?: string | null;
}) {
  try {
    const owner = await getRegistryOwnerEmail({ fundId: opts.fundId });
    if (!owner) return;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const dashboardLink = `${siteUrl}/dashboard/registry/${owner.registryId}?highlight=${opts.fundId}`;
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(opts.amount);

    await getResend().emails.send({
      from: FROM,
      to: TEST_RECIPIENT_OVERRIDE || owner.email,
      subject: `💵 ${opts.buyerName} contributed ${formatted} to "${opts.fundTitle}"`,
      html: `
        <p>Hi ${owner.name},</p>
        <p><strong>${opts.buyerName}</strong> contributed <strong>${formatted}</strong> to your cash fund <strong>${opts.fundTitle}</strong> on <em>${owner.registryTitle}</em>.</p>
        ${opts.message ? `<p>Their message: "${opts.message}"</p>` : ""}
        <p style="margin: 16px 0;"><a href="${dashboardLink}" style="color:#004659;">View on Dashboard</a></p>
        <p style="color:#888;font-size:13px;">You're receiving this because someone interacted with your baby registry.</p>
      `,
    });
  } catch (err) {
    console.error("[email] Failed to send cash fund notification:", err);
  }
}

export async function notifyItemCovered(opts: {
  itemId: string;
  itemTitle: string;
  buyerName: string;
  message?: string | null;
}) {
  try {
    const owner = await getRegistryOwnerEmail({ itemId: opts.itemId });
    if (!owner) return;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const dashboardLink = `${siteUrl}/dashboard/registry/${owner.registryId}?highlight=${opts.itemId}`;

    await getResend().emails.send({
      from: FROM,
      to: TEST_RECIPIENT_OVERRIDE || owner.email,
      subject: `🎉 ${opts.buyerName} is covering "${opts.itemTitle}"`,
      html: `
        <p>Hi ${owner.name},</p>
        <p><strong>${opts.buyerName}</strong> offered to cover the cost of <strong>${opts.itemTitle}</strong> on your registry <em>${owner.registryTitle}</em>.</p>
        ${opts.message ? `<p>Their message: "${opts.message}"</p>` : ""}
        <p style="margin: 16px 0;"><a href="${dashboardLink}" style="color:#004659;">View on Dashboard</a></p>
        <p style="color:#888;font-size:13px;">You're receiving this because someone interacted with your baby registry.</p>
      `,
    });
  } catch (err) {
    console.error("[email] Failed to send item covered notification:", err);
  }
}

export async function sendManagerInvite(opts: {
  toEmail: string;
  inviterName: string;
  registryTitle: string;
  token: string;
}) {
  try {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const inviteUrl = `${siteUrl}/invite/${opts.token}`;

    await getResend().emails.send({
      from: FROM,
      to: TEST_RECIPIENT_OVERRIDE || opts.toEmail,
      subject: `${opts.inviterName} invited you to manage "${opts.registryTitle}"`,
      html: `
        <p>Hi there,</p>
        <p><strong>${opts.inviterName}</strong> has invited you to help manage the baby registry <strong>${opts.registryTitle}</strong>.</p>
        <p>As a manager, you'll be able to add and edit items, view gift activity, and help organize the registry.</p>
        <p style="margin: 24px 0;">
          <a href="${inviteUrl}" style="background-color: #004659; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Accept Invitation
          </a>
        </p>
        <p style="color:#888;font-size:13px;">Or copy this link: ${inviteUrl}</p>
        <p style="color:#888;font-size:13px;">This invite expires in 7 days.</p>
      `,
    });
  } catch (err) {
    console.error("[email] Failed to send manager invite:", err);
  }
}

export async function notifyNewSuggestion(opts: {
  registryId: string;
  title: string;
  suggestedByName: string;
  price?: number | null;
  notes?: string | null;
}) {
  try {
    const owner = await getRegistryOwnerEmail({ registryId: opts.registryId });
    if (!owner) return;

    const priceText = opts.price
      ? ` (${new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(opts.price)})`
      : "";

    await getResend().emails.send({
      from: FROM,
      to: TEST_RECIPIENT_OVERRIDE || owner.email,
      subject: `💡 ${opts.suggestedByName} suggested "${opts.title}"`,
      html: `
        <p>Hi ${owner.name},</p>
        <p><strong>${opts.suggestedByName}</strong> suggested adding <strong>${opts.title}</strong>${priceText} to your registry <em>${owner.registryTitle}</em>.</p>
        ${opts.notes ? `<p>Their note: "${opts.notes}"</p>` : ""}
        <p>Head to your dashboard to accept or decline this suggestion.</p>
        <p style="color:#888;font-size:13px;">You're receiving this because someone interacted with your baby registry.</p>
      `,
    });
  } catch (err) {
    console.error("[email] Failed to send suggestion notification:", err);
  }
}
