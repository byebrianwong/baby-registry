# Baby Registry App — Implementation Plan

Tech stack: **Next.js (App Router) + Supabase + Vercel**.

---

## Phase 1: Project Scaffolding & Auth (Week 1)

### 1.1 Initialize the Project
- `npx create-next-app@latest` with TypeScript, Tailwind CSS, App Router, `src/` directory
- Install dependencies: `@supabase/ssr`, `@supabase/supabase-js`
- Set up ESLint, Prettier
- Create a Supabase project (Pro tier, $25/month)
- Configure environment variables:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (server-only)

### 1.2 Supabase Client Utilities
Create three client files:
- `src/utils/supabase/client.ts` — browser client for Client Components
- `src/utils/supabase/server.ts` — server client for Server Components & Server Actions
- `src/utils/supabase/middleware.ts` — session refresh in Next.js middleware

### 1.3 Authentication
- **Registry owners (parents):** Email/password + Google OAuth signup/login
- **Gift givers:** Anonymous sessions via `supabase.auth.signInAnonymously()` — no signup required to browse or purchase. Collect name + email only at purchase time.
- Create `src/middleware.ts` for session refresh on every request
- **Security:** Always verify auth server-side with `supabase.auth.getUser()` — never trust middleware alone (CVE-2025-29927)

### 1.4 Route Group Structure
```
src/app/
├── (auth)/
│   ├── login/page.tsx
│   └── signup/page.tsx
├── (protected)/
│   ├── dashboard/page.tsx
│   ├── registry/
│   │   ├── new/page.tsx
│   │   └── [registryId]/
│   │       ├── page.tsx          # owner's edit view
│   │       ├── items/page.tsx
│   │       └── settings/page.tsx
│   └── layout.tsx                # auth guard
├── (public)/
│   ├── page.tsx                  # landing page
│   └── r/[slug]/page.tsx         # shareable registry view
└── layout.tsx
```

### 1.5 Profiles Table & Trigger
- Create `profiles` table extending `auth.users` (id, role, full_name, avatar_url, created_at)
- Set up a database trigger to auto-create a profile row on `auth.users` insert

---

## Phase 2: Database Schema & Core CRUD (Week 2)

### 2.1 Database Tables
Write and run SQL migrations for the six core tables:

| Table | Key Columns | Notes |
|-------|-------------|-------|
| `profiles` | id (FK auth.users), role, full_name, avatar_url | Trigger-populated |
| `registries` | id, owner_id, title, slug (unique), event_date, is_public, settings (JSONB), created_at | Slug powers `/r/[slug]` URLs |
| `categories` | id, registry_id, name, sort_order | Per-registry, seeded from defaults |
| `registry_items` | id, registry_id, category_id, title, external_url, image_url, price, quantity_needed, quantity_fulfilled, is_essential, notes, version | `version` for optimistic concurrency |
| `cash_funds` | id, registry_id, title, description, goal_amount, current_amount | e.g., "Diaper Fund" |
| `purchases` | id, registry_item_id (nullable), cash_fund_id (nullable), buyer_name, buyer_email, quantity, amount, status (reserved/purchased/cancelled), created_at | Polymorphic link to item or fund |

### 2.2 Row Level Security Policies
- **Public read:** Anyone can `SELECT` on registries (where `is_public = true`), registry_items, categories, and cash_funds
- **Owner write:** Only `auth.uid() = owner_id` can INSERT/UPDATE/DELETE on registries, items, categories, funds
- **Purchases:** Insert allowed for authenticated users (including anonymous sessions) via the `reserve_registry_item` security-definer function

### 2.3 Reserve Item Function
Implement the `reserve_registry_item` PostgreSQL function with `SELECT FOR UPDATE` row locking to prevent double-purchasing (see `supabase/migrations/001_initial_schema.sql`).

### 2.4 Registry CRUD (Server Actions)
- Create registry (generate unique slug, seed default categories)
- Update registry (title, event_date, settings, privacy)
- Delete registry
- Generate TypeScript types with `supabase gen types typescript`

### 2.5 Registry Item CRUD (Server Actions)
- Add item (manual entry: title, URL, image, price, category, quantity, notes)
- Edit item
- Remove item
- Reorder items within categories
- Mark item as essential/optional

---

## Phase 3: Checklist & Category System (Week 3)

### 3.1 Seed Data — Default Checklist
Create a seed file with the canonical ~125 items across 10 categories, each tagged essential or optional:

| Category | Items | Essential |
|----------|-------|-----------|
| Nursery & Sleep | ~15 | crib, mattress, bassinet, sheets, monitor, swaddles |
| Feeding | ~15 | bottles, breast pump, nursing pillow, high chair |
| Diapering | ~8 | diapers (NB/1/2), wipes, cream, pail, diaper bag |
| Gear & Travel | ~10 | infant car seat, stroller, carrier |
| Bath | ~6 | baby tub, towels, washcloths |
| Clothing | ~20 | onesies, sleepers, socks, hats, mittens |
| Health & Safety | ~8 | thermometer, aspirator, humidifier, pacifiers |
| Toys & Books | ~8 | board books, rattles, high-contrast cards |
| Maternity & Postpartum | ~5 | recovery kit, peri bottle, nursing bras |
| Gifts & Extras | variable | gift cards, cash funds, memory book |

### 3.2 Interactive Checklist UI
- Show all 10 categories with expand/collapse
- Each item shows: name, essential badge, suggested price range, suggested quantity
- "Add to Registry" button per item — pre-fills the add-item form
- Progress bar per category and overall (X of Y essentials added)
- Filter: show all / essentials only / not yet added

### 3.3 Category Management
- Parents can rename, reorder, hide, or add custom categories
- Default categories seeded on registry creation from the seed data

---

## Phase 4: Public Registry & Gift Giver Experience (Week 4)

### 4.1 Shareable Registry Page (`/r/[slug]`)
- Server Component: fetch registry + items + categories + cash funds by slug
- Display: parent names, event date, optional photo/message
- Items grouped by category, showing: image, title, price, store link, quantity remaining
- Responsive grid layout

### 4.2 Purchase / Reserve Flow
- Gift giver clicks "I'll Get This" on an item
- Modal collects: name, email, quantity (if multi-quantity item), optional message
- Calls `reserve_registry_item` RPC function
- On success: show confirmation, update UI in real-time
- Gift giver is signed in anonymously if not already authenticated

### 4.3 Cash Fund Contributions
- Display fund title, description, goal, progress bar
- "Contribute" button opens amount input + name/email
- Process via Stripe (see Phase 6) — funds go directly to parent's bank
- Show contribution on the registry as a purchase record

### 4.4 Privacy Controls
- Public: anyone with the link can view
- Password-protected: prompt for password before revealing items
- Private: only the owner can view (useful during setup)

---

## Phase 5: Dashboard & Registry Management (Week 5)

### 5.1 Owner Dashboard
- List of registries (most parents have one, but support multiple)
- Per-registry stats: total items, items fulfilled, percent complete, total value, value fulfilled
- Recent activity feed (recent purchases/reservations)

### 5.2 Item Management UI
- Table/card view of all items with inline editing
- Drag-and-drop reorder within categories
- Bulk actions: move to category, mark essential, delete
- Image upload to Supabase Storage (bucket: `registry-images/{user_id}/{registry_id}/`)

### 5.3 Purchase Tracking View
- List of all purchases/reservations with buyer name, item, date, status
- Owner can mark external purchases as fulfilled manually
- Owner can cancel a reservation (frees up quantity)

### 5.4 Registry Settings
- Edit title, slug, event date, description, photo
- Privacy toggle (public/password/private)
- Completion discount reminder (informational — links to retailer programs)

---

## Phase 6: Payments — Cash Funds via Stripe (Week 6)

### 6.1 Stripe Integration
- Install `stripe` and `@stripe/stripe-js`
- Create Stripe Connect account for the platform
- Parents onboard via Stripe Connect Express (collects bank info for payouts)

### 6.2 Cash Fund Payment Flow
1. Gift giver selects fund and enters amount
2. Server Action creates a Stripe PaymentIntent with `transfer_data` to parent's connected account
3. Client-side Stripe Elements for card input
4. On success: webhook updates `cash_funds.current_amount` and creates a `purchases` record
5. Fee structure: pass-through Stripe fees (~2.9% + $0.30) — no platform markup initially

### 6.3 Webhooks
- `payment_intent.succeeded` — confirm purchase, update fund amount
- `payment_intent.payment_failed` — mark purchase as failed
- `account.updated` — track parent's Stripe Connect status
- Webhook endpoint at `/api/webhooks/stripe`

---

## Phase 7: Real-Time Updates & Notifications (Week 7)

### 7.1 Supabase Realtime
- Enable Realtime on `registry_items` and `purchases` tables
- Client Component hook: subscribe to `postgres_changes` filtered by `registry_id`
- Live update item quantities and purchase status on the public registry page
- Live update dashboard activity feed for owners

### 7.2 Email Notifications (Supabase Edge Functions or Resend)
- **To owner:** "Someone reserved [item] from your registry!" with buyer name
- **To gift giver:** Purchase confirmation with item details and registry link
- **To owner:** Weekly digest — registry stats, new reservations, checklist progress
- **Approaching due date:** Reminder to review registry, info about completion discounts

---

## Phase 8: External Item Scraping — Universal Registry (Week 8)

### 8.1 URL Metadata Scraper
- Server Action / API route: accepts a product URL
- Scrape using a lightweight approach:
  - Fetch page HTML server-side
  - Parse Open Graph tags (`og:title`, `og:image`, `og:price:amount`) and JSON-LD structured data
  - Fallback to `<title>` and meta description
- Return: title, image URL, price, store name
- Cache scraped images to Supabase Storage to prevent broken links

### 8.2 "Add from URL" Flow
- Parent pastes a product URL into the add-item form
- Auto-populates title, image, price from scraper
- Parent assigns category, sets quantity, adds notes
- Save as a `registry_item` with `external_url` populated

### 8.3 Future: Browser Extension / Share Sheet (Post-MVP)
- Chrome extension that sends the current page URL to the app's scraper endpoint
- iOS/Android share sheet integration (requires native wrapper — React Native or PWA)
- Not in initial scope but design the scraper API to support these clients

---

## Phase 9: Polish, SEO & Launch Prep (Week 9–10)

### 9.1 Landing Page
- Value proposition: "One registry, every store"
- How it works (3-step visual)
- Comparison table vs. Babylist/Amazon/Target
- CTA: "Create Your Registry"

### 9.2 SEO & Metadata
- Dynamic OG images for registry pages (parent names + event date)
- Sitemap for public registries
- Structured data (JSON-LD) for registry pages

### 9.3 Mobile Responsiveness
- Test all flows on mobile (registry creation, item browsing, purchase flow)
- Bottom sheet modals for mobile purchase flow
- Touch-friendly drag-and-drop for item reordering

### 9.4 Error Handling & Edge Cases
- Graceful handling of: expired/invalid URLs, duplicate slugs, concurrent purchase conflicts
- Toast notifications for success/error states
- Loading skeletons for all data-fetching pages

### 9.5 Deployment
- Deploy to Vercel (connect GitHub repo)
- Use Vercel Marketplace Supabase integration for auto-synced env vars
- Set up `supabase gen types typescript` in CI pipeline
- Custom domain setup
- Verify Supabase RLS policies with test accounts

---

## Post-Launch Roadmap (Future Phases)

| Feature | Priority | Notes |
|---------|----------|-------|
| Retailer affiliate integration (Target via Impact Radius, Amazon Associates) | High | Revenue stream: 1–8% commission on attributed purchases |
| Completion discount tracker | High | Surface Target/Amazon discount eligibility and timelines |
| Registry quiz / onboarding flow | Medium | Generate personalized starter checklist from due date + preferences |
| Group gifting on high-ticket items | Medium | Multiple contributors toward one item, with progress bar |
| 1:1 registry consultant chat | Low | Could use AI initially |
| Email parsing for purchase detection | Low | Scan gift giver confirmation emails to auto-mark purchases |
| Mobile app (React Native) | Low | PWA may suffice initially |
| Welcome box partnerships | Low | Negotiate with brands for free sample kits |

---

## Key Technical Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Framework | Next.js App Router | Server Components for fast registry pages, Server Actions for mutations |
| Database | Supabase (PostgreSQL) | RLS, Realtime, Storage, Auth in one platform; $25/month Pro tier |
| Auth strategy | Full accounts for parents, anonymous sessions for gift givers | Zero friction for gift givers while RLS still works |
| Concurrency control | `SELECT FOR UPDATE` in PostgreSQL function | Prevents double-purchasing — the hardest technical problem |
| Payments | Stripe Connect Express | Direct bank transfer for cash funds |
| Hosting | Vercel | Native Next.js support, preview deployments, free tier sufficient |
| Styling | Tailwind CSS + shadcn/ui | Rapid development with consistent, accessible components |
| Image handling | Supabase Storage + Next.js Image | Cache external product images to prevent broken links |

---

## Infrastructure Cost Estimate

| Service | Tier | Monthly Cost |
|---------|------|-------------|
| Supabase | Pro | $25 |
| Vercel | Hobby/Pro | $0–20 |
| Stripe | Pay-as-you-go | ~2.9% + $0.30 per transaction (passed to gift giver) |
| Domain | Annual | ~$12/year |
| **Total** | | **~$25–50/month** |

Supports ~1,000 users comfortably with room to 10x without architectural changes.
