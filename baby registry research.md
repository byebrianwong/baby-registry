# Building a Babylist competitor: the complete research foundation

**A baby registry app built on Supabase + Next.js can reach feature parity with Babylist's core experience at ~$25–50/month infrastructure cost, serving 1,000 users comfortably.** The critical competitive surface is the universal registry — linking items from any store into a single list — combined with a guided checklist of ~125 items across 10 categories. This report synthesizes product research on Babylist, Target, and Amazon registries with a technical architecture blueprint and the canonical item checklist needed to build the product spec, technical spec, and implementation plan.

---

## How Babylist dominates the registry market

Babylist captures **1 in 2 first-time parents** in the US and generates over **$500M in annual revenue** across four streams: its own retail shop, affiliate commissions (~30% of revenue), a fast-growing media/advertising business, and Babylist Health (a **$50M** insurance-covered breast pump vertical). The product's moat is its universal registry — parents add items from any online store via a browser extension or mobile share sheet, creating a single list that aggregates gifts across retailers.

**Registry creation takes under 5 minutes.** The onboarding collects name, email, due date (which drives trimester-specific recommendations), and an optional photo/description. Parents get a custom URL (e.g., `babylist.com/yourname`), privacy controls (public, private, or password-protected), and free physical info cards with QR codes for shower invitations. A personalized quiz generates a starter checklist, and free 1:1 registry consultants are available via chat, email, or phone.

The interactive checklist contains **10 categories with 78 subcategory items**, each tagged as "Essential" or optional. It syncs directly with the registry, showing completion progress. The categories are: Feeding (14 items, 4 essential), Sleeping (7 items, 6 essential), Diapering (9 items, 8 essential), Baby Gear (14 items, 3 essential), Health & Safety (7 items, 5 essential), Bathing (5 items, 2 essential), Nursery & Decor (7 items, 0 essential), Clothing (10 items, 5 essential), Playing (5 items, 0 essential), and an implicit Gifts/Extras category for cash funds and services.

**The universal registry works through three input methods**: a drag-and-drop bookmarklet, a Chrome extension, and a mobile share sheet (iOS/Android). All three auto-scrape the product image, name, price, and URL. Users assign a category, set quantity needed, add notes, and optionally enable group gifting. The critical weakness: **external purchase tracking is entirely manual.** Gift givers must return to Babylist and click "I've Purchased This" — leading to frequent duplicate gifts. Only Babylist Shop purchases are auto-tracked.

**Cash funds** let parents create preset or custom monetary goals (college fund, diaper fund, doula fund). Babylist processes contributions directly and transfers to the parent's bank account, charging gift givers a **2.9% + $0.90 fee** per contribution. Group gifting is separate — multiple people contribute toward a Babylist Shop item, but contributions become **store credit locked to Babylist**, not cash. This distinction matters for your product spec: offering cash-out for both fund types is a competitive advantage.

Babylist's **15% completion discount** activates 60 days before the due date, remains valid 6 months after birth, applies only to Babylist Shop items, and caps at **$300 total savings**. The Hello Baby Box (free sample kit) requires adding 3+ Babylist Shop items, 3+ external items, and a $20–30 minimum Babylist Shop purchase.

---

## Target and Amazon registry integration mechanics

### Target's registry system

Target registries use a straightforward URL pattern: `target.com/gift-registry/gift-giver?registryId=<32-char-hex-UUID>`. The `registryId` is a UUID without hyphens (e.g., `b9b7ec0d1dd14380aabebc9549dcb9d6`). Registrants can create custom shareable URLs that redirect to this canonical format. The `type=BABY` parameter appears on checklist URLs to filter by registry type.

**Purchase attribution happens three ways**: online purchases added to cart from the registry page auto-update within **15 minutes**; in-store purchases require the cashier to scan a registry barcode; and gift givers can manually mark items as purchased. There is **no public API** for registry data. Third-party integration works through Target's affiliate program on **Impact Radius** (`partners.target.com`), with category-based commissions of **1–8%** and a 7-day cookie window. Deep linking is available through Impact, and there are special bounties for driving registry creation.

Target's benefits are strong:

- **Welcome kit** (over $100 value): Requires joining Target Circle, adding 10 unique items, and making a $10+ purchase from the registry
- **15% completion discount**: Issued 8 weeks before due date, valid 6 months after, redeemable **twice** (once in-store, once online), applies storewide (not just baby items), and stacks with the RedCard's 5% discount
- **365-day return policy** on registry items (vs. standard 90 days), refunded as Target GiftCard
- **Group gifting** on items $100+

Target organizes its checklist into **12 categories**: Strollers & Car Seats, Gear & Activity, Nursery Furniture, Nursery Bedding, Feeding, Nursing, Bath, Diapering, Health & Safety, Clothing, Toys & Books, and Parenting.

### Amazon's registry system

Amazon registry URLs follow the pattern `amazon.com/baby-reg/[name-slug]/[REGISTRY_ID]` where the registry ID is an alphanumeric string like `1XZJMESPWOQ1W`. Share URLs use `amazon.com/baby-reg/share?registryId=[ID]`. The name slug is decorative — the functional identifier is the registry ID alone.

**Purchase attribution is session-based and server-side.** Items must be added to cart using the "Add to Cart" button within the registry interface; purchases made from product pages or search results are NOT attributed to the registry. There are no visible URL parameters for registry attribution — it's handled entirely server-side. For affiliate integration, the `tag=` parameter (`?tag=[AssociateTrackingID]`) is the standard mechanism, and Amazon offers a specific registry bounty program for affiliates who drive registry creation.

Amazon's completion discount is **15% for all registry owners** (some sources still cite 10% for non-Prime, 15% for Prime — the current official page says 15% for all). It activates **60 days before** the arrival date, expires **90 days after** (150-day total window), covers up to **$2,000 in orders** with a **$300 maximum discount** and **50 items per checkout**. Items must be added to cart from the registry page with the discount option checked. Universal registry items and non-Amazon-fulfilled items are excluded.

Amazon's Welcome Box (up to **$35 value**) requires Prime membership, 10 unique items, a $10+ purchase, and 60%+ checklist completion. The **20% diaper discount** activates after $500+ in registry spending and stacks with Subscribe & Save for up to 40% off. Amazon's **365-day return policy** on registry items extends the standard 30-day window. Notably, Amazon **discontinued its universal registry feature in June 2023** when it retired the Amazon Assistant browser extension.

Amazon uses **8 categories**: Out & About, Nursery, Feeding, Diapering, Bath Time, Health & Safety, Play & Learn, and Clothing.

---

## The canonical registry checklist: 10 categories, ~125 items

Cross-referencing Babylist, Amazon, Target, The Bump, and expert recommendations, the standard registry contains **100–150 items** (Babylist average: 125) across **10 categories**. A minimalist registry covers 35–50 items; a second-baby registry focuses on consumables and safety replacements. The recommended price distribution is **60–70% of items under $25**, with a few big-ticket group-gift items.

### Essential items and quantities by category

**Nursery & Sleep** (~15 items): 1 crib ($150–600), 1 crib mattress ($50–250), 1 bassinet ($100–400), 2–4 fitted crib sheets, 2 waterproof mattress protectors, 4–6 swaddles, 2–3 sleep sacks, 1 baby monitor ($40–350), 1 sound machine, 1 changing pad with 2–3 covers, 1 dresser, 1 glider/rocker ($150–800).

**Feeding** (~15 items): 8–16 bottles (start with 2–3 brands), 8–12 burp cloths, 4–6 bibs, 1 breast pump (often $0 through insurance), 1 nursing pillow, nursing pads, nipple cream, breast milk storage bags, 1 high chair ($30–350), 1 bottle brush, and later-stage items like sippy cups and baby spoons.

**Diapering** (~8 items): 2–3 boxes each of newborn, size 1, and size 2 diapers (newborns use 8–12/day, costing $70–100/month), 4+ packs of wipes, 1–2 tubes of diaper rash cream, 1 diaper pail, 1 diaper bag ($30–200), 1–2 portable changing pads.

**Gear & Travel** (~10 items): 1 infant car seat ($150–500, always buy new), 1 convertible car seat ($150–400), 1 full-size stroller ($200–1,000+), 1 baby carrier/wrap ($30–200), 1 play mat/activity gym, and optional items like a travel crib, bouncer, and swing.

**Bath** (~6 items): 1 baby bathtub ($15–50), 2–3 hooded towels, 6–10 washcloths, baby shampoo/wash, baby lotion.

**Clothing** (~20 items across sizes): For 0–3 months, register for 8–10 onesies, 6–8 sleepers (zip-up preferred), 3–5 pants, 6+ pairs of socks, 2–3 hats, 2–3 pairs of mittens. Register lightly for newborn size (babies outgrow it fast) and 6–12 months (buy as needed). Seasonal items vary — winter babies need snowsuits and heavier sleep sacks, summer babies need sun hats and lightweight muslins.

**Health & Safety** (~8 items): 1 thermometer (rectal for infants), 1 nasal aspirator, 1 nail clipper set, 1 humidifier, pacifiers (2–4, try multiple brands), teethers, baby-safe detergent, first aid kit. Childproofing items (gates, outlet covers, cabinet locks) are needed later.

**Toys & Books** (~8 items): 5–10 board books, 2–4 rattles/teethers, 1 set of high-contrast cards, 1–2 soft plush toys.

**Maternity & Postpartum** (~5 items): 1 postpartum recovery kit, 1 peri bottle, 3–5 pairs postpartum underwear, nursing bras, and optional lactation supplements.

**Gifts & Extras**: Gift cards, cash fund contributions, baby memory book, milestone cards/blankets.

**Items experts say to skip**: Crib bumpers (SIDS risk), wipe warmers, baby shoes under 6 months, baby walkers (safety hazard), and bedding sets with blankets/pillows.

---

## Supabase + Next.js architecture for the registry app

### Authentication and user model

Use the `@supabase/ssr` package (not the deprecated auth-helpers) with three client utilities: a browser client for Client Components, a server client for Server Components/Actions, and a middleware client for session refresh. Create separate files at `utils/supabase/client.ts`, `utils/supabase/server.ts`, and `utils/supabase/middleware.ts`.

**The two-user-type problem is the key auth design decision.** Registry owners (parents) should use email/password + Google OAuth with full accounts. Gift givers need minimal friction — they should browse registries without signing up. The recommended pattern: use Supabase's **anonymous sessions** (`supabase.auth.signInAnonymously()`) for gift givers, which grants an `authenticated` role JWT marked `is_anonymous`. They collect name and email only at the point of marking a purchase. This approach lets Row Level Security (RLS) work naturally while requiring zero signup friction.

**Critical security note**: Never rely solely on Next.js middleware for auth (CVE-2025-29927). Always verify auth at every data access point with `supabase.auth.getUser()`. Middleware is a convenience layer; RLS + server-side auth checks are the real security boundary.

### Database schema

The core schema requires six tables: **profiles** (extends auth.users with role, name, avatar), **registries** (owner_id, title, slug for shareable URLs, event_date, is_public, settings JSONB), **categories** (per-registry, with sort_order), **registry_items** (title, external_url, image_url, price, quantity_needed, quantity_fulfilled, version for optimistic concurrency), **cash_funds** (goal_amount, current_amount), and **purchases** (links to either a registry_item or cash_fund, tracks buyer info, status of reserved/purchased/cancelled).

**Preventing two people from buying the same item** is the hardest technical problem. Use a PostgreSQL function with `SELECT FOR UPDATE` row locking:

```sql
CREATE OR REPLACE FUNCTION public.reserve_registry_item(
  p_item_id UUID, p_quantity INT, p_buyer_name TEXT, p_buyer_email TEXT
) RETURNS JSONB AS $$
DECLARE v_item RECORD; v_purchase_id UUID;
BEGIN
  SELECT * INTO v_item FROM registry_items WHERE id = p_item_id FOR UPDATE;
  IF v_item.quantity_fulfilled + p_quantity > v_item.quantity_needed THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not enough quantity available');
  END IF;
  UPDATE registry_items SET quantity_fulfilled = quantity_fulfilled + p_quantity,
    version = version + 1 WHERE id = p_item_id;
  INSERT INTO purchases (registry_item_id, buyer_name, buyer_email, quantity, status)
    VALUES (p_item_id, p_buyer_name, p_buyer_email, p_quantity, 'reserved')
    RETURNING id INTO v_purchase_id;
  RETURN jsonb_build_object('success', true, 'purchase_id', v_purchase_id);
END; $$ LANGUAGE plpgsql SECURITY DEFINER;
```

RLS policies should allow anyone (including `anon` role) to view public registries and their items, restrict CRUD operations on registries/items to owners via `auth.uid() = owner_id`, and allow anyone to create purchases through the security-definer function.

### Realtime, storage, and scalability

Enable **Supabase Realtime** on registry_items and purchases tables to push live updates when gifts are purchased. Subscribe to `postgres_changes` events filtered by registry_id. Free tier supports **200 concurrent connections** (ample for 1,000 users — peak concurrent viewers will be well under 50).

For images, use **Supabase Storage** with a public bucket organized by `{user_id}/{registry_id}/{filename}`. Cache external product thumbnails (300×300) to prevent broken images when stores change URLs. Use Next.js Image component with a custom Supabase loader for optimization. Image transformations (server-side resize) require the Pro plan.

**Start on the Supabase Pro tier at $25/month.** The free tier pauses projects after 1 week of inactivity, which is unacceptable for production. Pro provides 8 GB database (you'll use ~100–200 MB for 1,000 users), 100 GB file storage, 250 GB bandwidth, 100K MAUs, daily backups, and no pausing. Typical total cost: **$25–50/month** on Supabase + Vercel's free/hobby tier.

Use the **Vercel Marketplace Supabase integration** for auto-synced environment variables across production and preview branches. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` (safe to expose — RLS protects data) and `SUPABASE_SERVICE_ROLE_KEY` (server-only, never exposed). Use `supabase gen types typescript` in CI to auto-generate TypeScript types from the database schema.

### Recommended project structure

Organize routes into three groups: `(auth)` for login/signup pages, `(protected)` for dashboard and registry management (guarded by middleware), and `(public)` for the landing page and shareable registry views at `/r/[slug]`. Use Server Components for data fetching (registry pages, item lists) and Client Components for interactive features (real-time subscriptions, purchase modals, form submissions). Server Actions handle mutations like adding items or reserving purchases.

---

## Conclusion: where to differentiate

The research reveals clear product gaps to exploit. Babylist's manual purchase tracking for external stores is its biggest pain point — **automatic purchase detection** (even partial, via email parsing or retailer API polling) would be a significant differentiator. Cash fund contributions locked as store credit frustrate users — **offering direct bank transfer for all monetary contributions** with lower fees would win registrants. Amazon and Target both offer 15% completion discounts; partnering with these retailers via their affiliate programs (Impact Radius for Target, Amazon Associates) lets you surface those discounts while earning **1–8% commissions** on attributed purchases.

The technical architecture is straightforward: Supabase Pro + Vercel handles 1,000 users at $25–50/month with room to 10x without architectural changes. The `SELECT FOR UPDATE` concurrency pattern prevents double-purchasing, Realtime subscriptions provide live gift notifications, and anonymous sessions minimize friction for gift givers. The 10-category checklist with ~125 items, essential/optional tagging, and recommended quantities gives new parents the guided experience that drives registry completion — and completion drives purchases.