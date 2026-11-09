import { NextResponse, type NextRequest } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { isUuid } from "@/lib/extension";
import { isGiftLinkStep } from "@/lib/gifts";
import { MY_GIFTS_COOKIE, MY_GIFTS_COOKIE_OPTIONS, withGift } from "@/lib/my-gifts-cookie";

export const dynamic = "force-dynamic";

// The link in a guest's emails back to their gift. It adds the gift to this
// browser's gifts cookie, so the registry page shows it as theirs, then opens
// the registry at that gift. It changes no data: confirming or releasing
// happens on the page, so an email app that opens links ahead of time can't do
// either.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; purchaseId: string }> }
) {
  const { slug, purchaseId } = await params;
  const target = new URL(`/r/${encodeURIComponent(slug)}`, request.url);
  if (!isUuid(purchaseId)) return NextResponse.redirect(target);

  const { data: purchase } = await supabaseAdmin
    .from("purchases")
    .select("id, status, registry_item_id")
    .eq("id", purchaseId)
    .single();
  if (!purchase?.registry_item_id) return NextResponse.redirect(target);

  const { data: item } = await supabaseAdmin
    .from("registry_items")
    .select("id, registry_id")
    .eq("id", purchase.registry_item_id)
    .single();
  const { data: registry } = item
    ? await supabaseAdmin.from("registries").select("slug").eq("id", item.registry_id).single()
    : { data: null };
  if (!item || registry?.slug !== slug) return NextResponse.redirect(target);

  target.searchParams.set("gift", item.id);
  const step = request.nextUrl.searchParams.get("step");
  if (purchase.status === "cancelled") target.searchParams.set("step", "ended");
  else if (isGiftLinkStep(step)) target.searchParams.set("step", step);

  const response = NextResponse.redirect(target);
  if (purchase.status !== "cancelled") {
    response.cookies.set(
      MY_GIFTS_COOKIE,
      withGift(request.cookies.get(MY_GIFTS_COOKIE)?.value, "items", item.id, purchase.id),
      MY_GIFTS_COOKIE_OPTIONS
    );
  }
  return response;
}
