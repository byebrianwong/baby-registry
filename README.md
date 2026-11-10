# Regibee - One Registry, Every Store

A gift registry app built with Next.js, Supabase, and Tailwind CSS. It started as a baby registry and now also handles birthdays, Christmas, weddings, housewarmings and graduations. You add items from any store and share one link. Guests reserve gifts without signing up.

## Features

### Building a registry

- **Baby or personal registries** - Choose a type when you create a registry. A personal registry can name an occasion (birthday, Christmas, wedding, housewarming, graduation or other), which changes its labels and placeholders. Baby registries start with 10 categories. Personal registries start with none.
- **Items from any store** - Paste a product link and Regibee fills in the title, price and picture from that page where it can. You can also type the details yourself.
- **Browser extension** - The Chrome extension brings the items on your Amazon, Target, Walmart and Pottery Barn Kids registries into Regibee, with their registry links. On any shop's product page, it can also add that one item. See [extension/README.md](extension/README.md).
- **iPhone and Android app** - Share a product to Regibee from any store's app or Safari, and it's added with its name, price and pictures. The app also manages registries and shows gift activity. See [mobile/README.md](mobile/README.md).
- **Baby checklist** - Baby registries get a checklist of 100 suggested items in 10 categories (Nursery & Sleep, Feeding, Diapering, Gear & Travel, Bath, Clothing, Health & Safety, Toys & Books, Maternity & Postpartum, Gifts & Extras). Add the ones you want and dismiss the rest.
- **Cash funds** - Set up money goals, such as a diaper fund or a college fund. Guests pledge an amount and pay you directly by Venmo, PayPal or Zelle. Regibee doesn't handle money.
- **Items you already bought** - Mark an item as bought by you. Guests can still give it by sending you the money for it. With a US ZIP code and the sales tax option on, Regibee adds estimated sales tax to the price of these items.
- **Open to used** - Mark an item as fine to buy used, with a minimum condition.
- **Guest suggestions** - Guests can suggest items. You accept or decline them on the registry page.
- **Co-managers** - Invite a partner or family member by email or with an invite link. Managers can add and edit items, see gift activity and manage categories.
- **Gift activity** - See who reserved what, and cancel a reservation if you need to.

### Giving gifts

- **No account needed** - Guests open the share link (`/r/your-slug`) and reserve a gift without signing up. Regibee gives them an anonymous Supabase session behind the scenes.
- **No duplicate gifts** - Reservations go through a database function that locks the item's row (`SELECT ... FOR UPDATE`), so two guests can't both take the last one.
- **Shipping address after reserving** - A guest sees your shipping address only after they reserve an item. It's also in their confirmation email.
- **Emails** - Every manager gets an email when someone reserves an item, gives an item you already bought, pledges to a cash fund or suggests an item. Guests who give their email get a confirmation with a signed link back to the registry that highlights their gifts.

### Planning events

- **Events with invitations** - Plan a baby shower, bridal shower, birthday, Christmas party or any other event on the Events tab (`/dashboard/events`). Add the date, time, place, who's hosting and a message for guests.
- **Your own invitation** - Upload a picture of the invitation you designed, or a photo. Guests see it at the top of the event page and in their email.
- **Guest list and emails** - Add guests one at a time or paste a list from a spreadsheet. Regibee emails each guest the invitation with their own RSVP link, and can remind guests who haven't replied (at most once a day each). Replies to the email go to the host.
- **RSVPs** - Guests answer Going, Maybe or Can't go, say how many people are coming, and leave a note. They don't need an account. With open RSVPs on, anyone with the event link can RSVP and is added to the guest list. The host sees counts, can change an answer they heard in person, and can download the list as a CSV.
- **Linked to a registry** - An event can link to one of your registries, and its page sends guests there. Managers of that registry can manage the event too. Each registry's page shows its events and has a "Plan an event" button.
- **Calendars and maps** - The event page has Google Calendar and .ics links, and a map link for the address. Event pages are always hidden from search engines.

### Privacy

- **The share link always works** - Anyone with a registry's link can open it, public or private. That way guests never need an account.
- **Public or private** - Public registries can appear in search engines. Private registries are hidden from search engines, and on your profile only followers you approved can see them.

### Profiles and following

- **Profiles** - Every account has a profile at a link like `/u/jane-doe-k7m2p9qx4t`. The random id at the end is what's looked up, so the link can't be guessed and survives a name change. A profile shows only the registries its owner picks on the Account page (`/dashboard/account`). Profiles are hidden from search engines.
- **Finding people** - The Following page searches by name, for people who chose to show up in search, or by a whole email address, for people who turned on email search. Email addresses are never shown. When an address finds nobody, you can email it a follow invite (`/follow-invite/<token>`), which the person accepts after signing in or signing up.
- **You choose which registries appear** - Each registry has a "Show on my profile" option. Only the owner can turn it on, and it starts off.
- **Follows need approval** - Following someone sends them a request. They approve or decline it on their Account page, and can get an email about it (at most one a day from the same person). Approved followers see private registries on the profile. Everyone else sees only the public ones.
- **Following page** - `/dashboard/following` lists the registries of people who approved your follow, grouped into "Coming up", "Anytime" and "Past events".
- **People search** - Search by name or username on the Following page. Only people who turned on "Show me in people search" appear. If you're searchable, your own profile shows up too, labeled "That's you".
- **Follow from a registry** - A registry that's shown on its owner's profile says who shared it and has a Follow button.
- **Blocking** - Blocking someone removes any follow between you, stops their follow requests, and hides your profile and search result from them while they're signed in.

### Accounts and demo

- **Sign-up and password reset** - Accounts use an email and password. "Forgot password" sends a reset link by email.
- **Demo** - `/demo` shows the gift giver view with sample data, and `/demo/dashboard` shows the owner's side. No account needed.

## Tech Stack

- **Framework:** Next.js 16 (App Router, Server Components, Server Actions)
- **Database & Auth:** Supabase (PostgreSQL + RLS + Auth)
- **Styling:** Tailwind CSS v4 + shadcn/ui
- **Email:** Resend
- **Visual tests:** Storybook + Chromatic
- **Deployment:** Vercel

## Getting Started

### Prerequisites

- **Node.js 20.9 or later** (Next.js 16 doesn't run on older versions)
- **npm**
- A free [Supabase](https://supabase.com) account

### 1. Clone and install

```bash
git clone git@github.com:dango-design/regibee.git
cd regibee
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

4. Run the database migrations:
   - Go to **SQL Editor** in your Supabase Dashboard
   - Run every file in `supabase/migrations` in order, starting with `001_initial_schema.sql`. Two files start with `009`; run `009_registry_types.sql` first.
   - For each file, paste its contents in and click **Run**
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

1. **Sign up** with an email and password. If your Supabase project asks new users to confirm their email (new projects do by default), use an address you can read and click the link it sends.
2. **Create a registry** — choose Baby or Personal and give it a title. The date, welcome message, ZIP code and payment methods are optional.
3. **Browse the checklist** (baby registries only) — click "Checklist" to see the 100 suggested items and add the ones you want.
4. **Add your own items** — click "Add Item" and paste a product link. Regibee fills in what it can find on the page.
5. **Fill in Settings** — click "Settings" to add the names guests see (for example "Denise & Brian") and your shipping address. Under Managers, invite a co-manager by email or with a link.
6. **Share your registry** — click "Share Link" to copy the public link (for example `/r/your-slug`).
7. **Try the gift giver view** — open that link in a private window and reserve an item. Your shipping address appears after you reserve.
8. **Fill in your profile (optional)** — open Account from the menu and tick "Show on my profile" for a registry. Then click View profile.
9. **Try following (optional)** — sign up a second account in another browser. On its Following page, search for the first account by name or email and click Follow. Approve the request on the first account's Account page. The first account's registries now appear on the second account's Following page.

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login, signup and password reset pages
│   │   ├── login/
│   │   ├── signup/
│   │   ├── forgot-password/
│   │   └── reset-password/
│   ├── (protected)/      # Pages that need an account
│   │   └── dashboard/
│   │       ├── page.tsx           # Your registries
│   │       ├── account/           # Profile, follow requests, followers, blocked people
│   │       ├── following/         # Registries from people you follow, people search
│   │       ├── events/            # The Events tab, new events, and each event's guests and RSVPs
│   │       └── registry/
│   │           ├── new/           # Create a registry
│   │           └── [registryId]/
│   │               ├── page.tsx       # Items, gift activity, suggestions
│   │               ├── checklist/     # Baby checklist
│   │               └── settings/      # Registry settings and managers
│   ├── api/extension/    # The browser extension's API
│   ├── auth/callback/    # Where email confirmation and password reset links land
│   ├── demo/             # Demo pages with sample data
│   ├── extension/connect/ # Connects the browser extension to an account
│   ├── follow-invite/[token]/ # Answer an emailed invite to be followed
│   ├── invite/[token]/   # Accept an invite to co-manage a registry
│   ├── e/[slug]/         # Public event page with the RSVP form, and its .ics download
│   ├── r/[slug]/         # Public registry page (gift givers)
│   ├── u/[profile]/      # Profile pages
│   └── page.tsx          # Landing page
├── components/           # App components, many with a Storybook story beside them
│   ├── ui/               # shadcn/ui components
│   └── base/             # Shared inputs, buttons, menus and other building blocks
├── lib/
│   ├── actions/
│   │   ├── registry.ts   # Server actions: registries, items, funds, reservations, managers
│   │   ├── profile.ts    # Server actions: profile and "Show on my profile"
│   │   ├── follows.ts    # Server actions: follows, blocking, people search
│   │   ├── events.ts     # Server actions: events, guests, invitations, RSVPs
│   │   ├── scrape.ts     # Reads the title, price and pictures from a product link
│   │   └── tax.ts        # Sales tax estimate
│   ├── email.ts          # Notification emails (Resend)
│   ├── events.ts         # Event types, labels, dates and calendar links
│   ├── events-server.ts  # Reads for the event pages
│   ├── retailers.ts      # Store registry link rules, shared with the extension
│   ├── extension.ts      # Types and checks shared with the extension
│   ├── extension-server.ts # The extension's sessions and access checks
│   ├── email-templates.ts
│   ├── buyer-link.ts     # Signed links in guest confirmation emails
│   ├── checklist-data.ts # Baby checklist (100 items)
│   ├── registry-copy.ts  # Labels for each registry type and occasion
│   ├── follows.ts        # Reads follows and the Following page's registries
│   ├── username.ts       # Username rules
│   └── demo-data.ts      # Sample data for the demo pages
├── middleware.ts         # Refreshes the Supabase session on each request
└── utils/supabase/
    ├── client.ts          # Browser client
    ├── server.ts          # Server client
    └── middleware.ts       # Session refresh
extension/                # Chrome extension (see extension/README.md)
```

## Database Schema

Fourteen tables, all with Row Level Security turned on:

| Table | Purpose |
|-------|---------|
| `profiles` | One row per account, made by a trigger. Holds the name, the optional username and the search and email settings. |
| `registries` | Title, slug, type, date, privacy, whether it's on the owner's profile, and settings such as the shipping address and payment methods |
| `categories` | Each registry's categories. Baby registries start with 10. |
| `registry_items` | Items, with price, quantity and how many are reserved |
| `cash_funds` | Money goals |
| `purchases` | Reservations and pledges, each linked to an item or a fund |
| `suggestions` | Items guests suggest |
| `registry_managers` | Who can manage each registry |
| `registry_invites` | Invites to co-manage a registry |
| `follows` | Follow requests and approved follows |
| `user_blocks` | Who has blocked whom |
| `follow_request_emails` | When each follow request email was last sent, so asking again doesn't send another |
| `events` | Events: details, invitation picture, RSVP settings and the registry they link to |
| `event_guests` | Each event's guests, their personal RSVP link token, their answer and when they were emailed |

`follows`, `user_blocks`, `follow_request_emails`, `events` and `event_guests` have no access policies, so only server code using the service-role key can read or write them. The files in `supabase/migrations` hold the full schema, the access rules, and the database functions that handle reservations.

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
| `NEXT_PUBLIC_SITE_URL` | Client + Server | The site's address, used in links in emails. Defaults to `http://localhost:3000` |
| `RESEND_API_KEY` | Server only | Resend key for notification emails |
| `RESEND_TEST_RECIPIENT` | Server only | Optional. Sends every email to this address instead, for testing |

For how the live site, database and visual tests are run, see [CLAUDE.md](CLAUDE.md).
