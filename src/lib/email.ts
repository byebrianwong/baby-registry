import { Resend } from "resend";
import { supabaseAdmin } from "./supabase-admin";
import {
  itemReservedBuyerHtml,
  itemCoveredBuyerHtml,
  cashFundContributionBuyerHtml,
  itemReservedOwnerHtml,
  itemCoveredOwnerHtml,
  cashFundContributionOwnerHtml,
  newSuggestionOwnerHtml,
  managerInviteHtml,
} from "./email-templates";

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

interface ManagerEmailInfo {
  email: string;
  name: string;
  registryTitle: string;
  registryId: string;
  parentNames: string;
}

async function getRegistryManagerEmails(opts: {
  itemId?: string;
  fundId?: string;
  registryId?: string;
}): Promise<ManagerEmailInfo[] | null> {
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
    .select("title, parent_names, owner_id")
    .eq("id", registryId)
    .single();

  if (!registry) return null;

  const parentNames = registry.parent_names || "there";

  // Fetch all managers for this registry
  const { data: managers } = await supabaseAdmin
    .from("registry_managers")
    .select("user_id")
    .eq("registry_id", registryId);

  // Fall back to the registry owner if registry_managers has no rows
  const userIds = managers && managers.length > 0
    ? managers.map((m) => m.user_id)
    : [registry.owner_id];

  // Look up each manager's email and name
  const results: ManagerEmailInfo[] = [];
  for (const uid of userIds) {
    const [{ data: userData }, { data: profile }] = await Promise.all([
      supabaseAdmin.auth.admin.getUserById(uid),
      supabaseAdmin.from("profiles").select("full_name").eq("id", uid).single(),
    ]);
    if (userData?.user?.email) {
      results.push({
        email: userData.user.email,
        name: profile?.full_name || parentNames,
        registryTitle: registry.title,
        registryId,
        parentNames,
      });
    }
  }

  return results.length > 0 ? results : null;
}

interface PaymentMethods {
  venmo?: string;
  paypal?: string;
  zelle?: string;
}

async function getRegistryInfoForBuyer(opts: {
  itemId?: string;
  fundId?: string;
}): Promise<{ parentName: string; registryTitle: string; shippingAddress?: string; paymentMethods?: PaymentMethods; slug: string } | null> {
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
    .select("title, parent_names, settings, slug")
    .eq("id", registryId)
    .single();

  if (!registry) return null;

  const settings = registry.settings as Record<string, unknown> | null;
  const shippingAddress = (settings?.shipping_address as string) || undefined;
  const pm = settings?.payment_methods as PaymentMethods | undefined;
  const paymentMethods = pm && (pm.venmo || pm.paypal || pm.zelle) ? pm : undefined;

  return {
    parentName: registry.parent_names || "the registry owner",
    registryTitle: registry.title,
    shippingAddress,
    paymentMethods,
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
    await getResend().emails.send({
      from: FROM,
      to: TEST_RECIPIENT_OVERRIDE || opts.buyerEmail,
      subject: `Your gift is confirmed — "${opts.itemTitle}"`,
      html: itemReservedBuyerHtml(opts),
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
  paymentMethods?: { venmo?: string; paypal?: string; zelle?: string };
  registryUrl?: string;
  shopUrl?: string;
}) {
  try {
    await getResend().emails.send({
      from: FROM,
      to: TEST_RECIPIENT_OVERRIDE || opts.buyerEmail,
      subject: `Your gift is confirmed — "${opts.itemTitle}"`,
      html: itemCoveredBuyerHtml(opts),
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
  paymentMethods?: { venmo?: string; paypal?: string; zelle?: string };
  registryUrl?: string;
}) {
  try {
    await getResend().emails.send({
      from: FROM,
      to: TEST_RECIPIENT_OVERRIDE || opts.buyerEmail,
      subject: `Your contribution is confirmed — "${opts.fundTitle}"`,
      html: cashFundContributionBuyerHtml(opts),
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
    const managers = await getRegistryManagerEmails({ itemId: opts.itemId });
    if (!managers) return;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const dashboardLink = `${siteUrl}/dashboard/registry/${managers[0].registryId}?highlight=${opts.itemId}`;

    await Promise.all(
      managers.map((m) =>
        getResend().emails.send({
          from: FROM,
          to: TEST_RECIPIENT_OVERRIDE || m.email,
          subject: `🎁 ${opts.buyerName} reserved "${opts.itemTitle}"`,
          html: itemReservedOwnerHtml({
            ownerName: m.name,
            registryTitle: m.registryTitle,
            buyerName: opts.buyerName,
            itemTitle: opts.itemTitle,
            quantity: opts.quantity,
            message: opts.message,
            dashboardLink,
          }),
        })
      )
    );
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
    const managers = await getRegistryManagerEmails({ fundId: opts.fundId });
    if (!managers) return;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const dashboardLink = `${siteUrl}/dashboard/registry/${managers[0].registryId}?highlight=${opts.fundId}`;
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(opts.amount);

    await Promise.all(
      managers.map((m) =>
        getResend().emails.send({
          from: FROM,
          to: TEST_RECIPIENT_OVERRIDE || m.email,
          subject: `💵 ${opts.buyerName} contributed ${formatted} to "${opts.fundTitle}"`,
          html: cashFundContributionOwnerHtml({
            ownerName: m.name,
            registryTitle: m.registryTitle,
            buyerName: opts.buyerName,
            fundTitle: opts.fundTitle,
            amount: opts.amount,
            message: opts.message,
            dashboardLink,
          }),
        })
      )
    );
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
    const managers = await getRegistryManagerEmails({ itemId: opts.itemId });
    if (!managers) return;

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const dashboardLink = `${siteUrl}/dashboard/registry/${managers[0].registryId}?highlight=${opts.itemId}`;

    await Promise.all(
      managers.map((m) =>
        getResend().emails.send({
          from: FROM,
          to: TEST_RECIPIENT_OVERRIDE || m.email,
          subject: `🎉 ${opts.buyerName} is covering "${opts.itemTitle}"`,
          html: itemCoveredOwnerHtml({
            ownerName: m.name,
            registryTitle: m.registryTitle,
            buyerName: opts.buyerName,
            itemTitle: opts.itemTitle,
            message: opts.message,
            dashboardLink,
          }),
        })
      )
    );
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
      html: managerInviteHtml({
        inviterName: opts.inviterName,
        registryTitle: opts.registryTitle,
        inviteUrl,
      }),
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
    const managers = await getRegistryManagerEmails({ registryId: opts.registryId });
    if (!managers) return;

    await Promise.all(
      managers.map((m) =>
        getResend().emails.send({
          from: FROM,
          to: TEST_RECIPIENT_OVERRIDE || m.email,
          subject: `💡 ${opts.suggestedByName} suggested "${opts.title}"`,
          html: newSuggestionOwnerHtml({
            ownerName: m.name,
            registryTitle: m.registryTitle,
            suggestedByName: opts.suggestedByName,
            title: opts.title,
            price: opts.price,
            notes: opts.notes,
          }),
        })
      )
    );
  } catch (err) {
    console.error("[email] Failed to send suggestion notification:", err);
  }
}
