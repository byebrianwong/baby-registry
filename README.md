# BabyList - One Registry, Every Store

A baby registry app built with Next.js, Supabase, and Tailwind CSS. Parents create a registry with items from any store, share a single link, and gift givers can reserve items with no sign-up required.

## Features

- **Universal Registry** - Add items from any online store by URL
- **Expert Checklist** - Curated list of ~125 items across 10 categories (Nursery, Feeding, Diapering, Gear, Bath, Clothing, Health, Toys, Postpartum, Gifts)
- **No Duplicate Gifts** - Real-time item reservations with `SELECT FOR UPDATE` concurrency control
- **Zero-Friction Gift Giving** - Gift givers browse and reserve without creating an account (anonymous Supabase sessions)
- **Cash Funds** - Set up monetary gift goals (diaper fund, college fund, etc.)
- **Shareable Links** - Each registry gets a unique `/r/your-slug` URL
- **Privacy Controls** - Public or private registries

## Tech Stack

- **Framework:** Next.js 16 (App Router, Server Components, Server Actions)
- **Database & Auth:** Supabase (PostgreSQL + RLS + Realtime + Auth)
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- **Node.js 18+** (tested with 20 and 25)
- **npm**
- A free [Supabase](https://supabase.com) account

### 1. Clone and install

```bash
git clone git@github.com:byebrianwong/baby-registry.git
cd baby-registry
npm install
```

### 2. Set up Supabase

1. Go to [supabase.com](https://supabase.com) and create a new project (free tier works fine for dev)
2. Copy the env example and fill in your credentials:

```bash
cp .env.local.example .env.local
```

3. Find your credentials in the Supabase Dashboard:
   - Go to **Project Settings > API**
   - `NEXT_PUBLIC_SUPABASE_URL` = the **Project URL** (e.g., `https://abcdefg.supabase.co`)
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the **anon / public** key
   - `SUPABASE_SERVICE_ROLE_KEY` = the **service_role** key (keep this secret)

4. Run the database migration:
   - Go to **SQL Editor** in your Supabase Dashboard
   - Copy the entire contents of `supabase/migrations/001_initial_schema.sql`
   - Paste it in and click **Run**
   - You should see "Success. No rows returned" — that means it worked

5. Enable anonymous sign-ins (required for gift givers to reserve items without an account):
   - Go to **Authentication > Providers > Anonymous Sign-In**
   - Toggle it **ON** and save

### 3. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see the landing page. Click **Sign up** to create an account and start building a registry.

### Quick walkthrough

1. **Sign up** with any email/password
2. **Create a registry** — give it a title and optional due date
3. **Browse the checklist** — click "Checklist" to see ~100 recommended items, add ones you want
4. **Add custom items** — click "Add Item" to add products from any URL
5. **Share your registry** — click "Share Link" to copy the public URL (e.g., `/r/your-slug`)
6. **Test the gift-giver view** — open that link in an incognito window and try reserving an item

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login & signup pages
│   │   ├── login/
│   │   └── signup/
│   ├── (protected)/      # Auth-guarded pages
│   │   └── dashboard/
│   │       ├── page.tsx           # Registry list
│   │       └── registry/
│   │           ├── new/           # Create registry
│   │           └── [registryId]/
│   │               ├── page.tsx       # Manage items
│   │               ├── checklist/     # Browse checklist
│   │               └── settings/      # Registry settings
│   ├── r/[slug]/         # Public registry view (gift givers)
│   └── page.tsx          # Landing page
├── components/
│   ├── ui/               # shadcn/ui components
│   ├── nav.tsx           # Navigation bar
│   ├── add-item-dialog.tsx
│   ├── item-card.tsx
│   ├── reserve-item-dialog.tsx
│   └── copy-link-button.tsx
├── lib/
│   ├── actions/registry.ts   # Server Actions (CRUD + reserve)
│   ├── checklist-data.ts     # Default checklist (~125 items)
│   └── utils.ts
└── utils/supabase/
    ├── client.ts          # Browser client
    ├── server.ts          # Server client
    └── middleware.ts       # Session refresh
```

## Database Schema

Six tables with Row Level Security:

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (auto-created via trigger) |
| `registries` | Registry metadata (title, slug, due date, privacy) |
| `categories` | Per-registry categories (seeded with 10 defaults) |
| `registry_items` | Items with price, quantity, fulfillment tracking |
| `cash_funds` | Monetary gift goals |
| `purchases` | Gift reservations (linked to items or funds) |

See `supabase/migrations/001_initial_schema.sql` for the full schema, RLS policies, and concurrency-safe RPC functions.

## Deployment

### Vercel

1. Push to GitHub
2. Import the repo in [Vercel](https://vercel.com)
3. Add environment variables from `.env.local`
4. Deploy

### Environment Variables

| Variable | Where | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Supabase anon key (safe to expose - RLS protects data) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Admin key - never expose to client |
