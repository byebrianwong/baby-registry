# Regibee: A Universal Registry and Event Planning Platform

**Role:** Sole product designer and front-end developer (research, UX/UI, branding, design system, implementation)
**Timeline:** V1 shipped and in active use. V2 in design and development.
**Tools:** Figma, Next.js, Supabase, Tailwind CSS, Storybook

> **[Visual: Hero image. Full-width screenshot of a populated Regibee registry page on desktop, showing the hero banner, category sidebar, item cards, and a cash fund card.]**

---

## The Problem

Gift registries are fragmented. Most platforms lock users into a single retailer. If you want items from multiple stores, you maintain separate lists and send separate links. And for every milestone (wedding, birthday, baby shower, housewarming), people start over with a new tool.

There's also a deeper problem with how registries handle the relationship between owners and gift givers. Registry owners do the legwork: researching products, reading reviews, comparing prices, waiting for sales. They know exactly which brand, model, and size they want. Gift givers browse the registry with far less context. They want to be generous, but they're often uncertain about whether something is the right version or a good price.

This mismatch creates friction on both sides. Owners sometimes buy items themselves because they found a deal or needed something before the event. Traditional registries mark those items as "fulfilled" and remove them. The owner loses out on financial help, the guest loses a gifting opportunity, and the person with the most knowledge about what to buy gets penalized for acting on it.

Event planning is similarly disconnected. Hosts plan parties in one app and share registries from another. Guests juggle multiple links and need accounts on platforms they'll use once.

I built Regibee to consolidate registries across stores and occasions, bridge the gap between the owner's expertise and the guest's generosity, and connect registries to the events around them.

> **[Visual: 2x2 diagram of the current fragmented landscape. Rows: "Registry" and "Event Planning." Columns: "Baby" and "Wedding." Each cell lists the separate tools people use today. A callout shows Regibee consolidating all four.]**

---

## Who Uses This

**Registry owners** create and manage their wish list. In V1, this is an expecting parent. In V2, it's anyone celebrating a milestone: a couple, someone turning 30, a grad furnishing their first apartment.

**Event hosts** plan the celebration, often a different person than the registry owner. They need to manage RSVPs and logistics while linking back to someone else's registry.

**Guests** give gifts or attend events. They interact with the platform once, maybe twice. They shouldn't need an account.

> **[Visual: User journey diagram with three swim lanes (Owner, Host, Guest) showing how their paths intersect.]**

---

## V1: What Shipped

The first version launched as a baby registry to validate the core concept: a universal registry that works with any store, requires no guest accounts, and handles the full gifting flow.

**Adding items from anywhere.** Owners paste a product URL from any retailer. The app scrapes product data (title, image, price) using Open Graph tags, JSON-LD, and meta tags. If scraping fails, owners fall back to manual entry.

> **[Visual: GIF of the add-item flow. User pastes a URL, form auto-populates with product data, item appears in the registry.]**

**No-signup guest experience.** Guests enter a name and email, reserve an item, and they're done. HMAC-signed cookies let returning visitors see which items they've already reserved across sessions without logging in. After reserving, the guest sees confetti, a personalized thank-you, and a direct link to purchase the item from the retailer.

> **[Visual: Side-by-side of the reserve flow. Left: reserve dialog with name/email fields. Right: celebration success state with confetti, panda mascot, and "Purchase this item" retailer link.]**

**Curated checklist.** New owners see ~125 suggested items across 10 categories with price ranges and quantities. Fuzzy matching links checklist items to registry items as they're added, with a progress circle tracking coverage. This helps first-time registrants who don't know where to start.

**Cash funds.** Owners create funds ("College fund," "Date night fund") with a goal amount. Guests contribute via Venmo, PayPal, or Zelle. Progress bars show how close each fund is to its goal.

**Multi-manager support.** Owners invite a co-manager via email with a 7-day expiration link. Both can edit items, view activity, and receive notifications. Permissions are scoped: managers can edit but can't delete the registry or invite others.

> **[Visual: Screenshot of a cash fund card with progress bar, and the multi-manager invite email.]**

---

## Deep Dive: The "Gift This" Feature

This feature directly addresses the owner/guest knowledge gap. Instead of penalizing owners for being informed shoppers, the platform lets them purchase items and still give guests a way to contribute. The owner handles the hard part (finding the right product at the right price), and the guest reimburses them.

**Owner side:** Toggle an item to "Purchased by you" in the dashboard. The item stays in the registry with a distinct visual state: light teal background, "Purchased by parent" tag. It's marked as fulfilled but remains interactive for guests.

**Guest side:** Instead of "Reserve," guests see a green "Gift this" button (#09c69a), visually distinct from the standard teal. They enter name, email, and an optional message. On success, the dialog shows the owner's payment methods (Venmo, PayPal, Zelle) so the guest can send money directly. Once covered, the item disables for all other visitors.

This is a better experience for guests too. They don't have to wonder if it's the right version or whether they're overpaying. The owner already made those decisions. The guest knows their contribution went toward something the owner actually wanted and already has.

> **[Visual: Three item states side by side in the guest view. Left: unfulfilled item with "Reserve." Center: owner-purchased item with green "Gift this" and teal background. Right: guest-reserved item dimmed at reduced opacity.]**

**The naming evolution.** Originally called "Cover the cost," the language made guests hesitate. "Covering a cost" felt obligatory. Renaming to "Gift this" reframed the action as generous rather than transactional, and completion rates improved.

> **[Visual: Before/after of the button label change. "Cover the cost" vs. "Gift this."]**

| Decision | Rationale |
|----------|-----------|
| Keep owner-purchased items visible | Owners are the experts. Removing items they bought punishes informed shopping and takes away gifting opportunities. |
| Different CTA color for "Gift this" | Prevents confusion with "Reserve." The color difference signals a different action at a glance. |
| Show payment methods on success, not shipping address | Guests need to know how to pay, not where to ship. Tested better than the original design. |
| Disable after one guest covers | Prevents duplicate contributions without requiring coordination. |

---

## Design System

Teal-based palette built on OKLCH color space. Mobile-first responsive layout. Components built on React Aria and shadcn/ui for accessibility.

**Category navigation** is a sticky sidebar on desktop, a floating action button on mobile. **Progressive disclosure** keeps the guest experience minimal (item cards, a reserve button, done) while the owner dashboard surfaces more controls. **The panda mascot** (Regibee) appears in the hero, on purchased items, in the celebration dialog, and as the favicon.

> **[Visual: Design system snapshot showing color palette, panda mascot in its various contexts, and 2-3 component examples (item card, button variants, celebration dialog).]**

> **[Visual: Responsive comparison. Same registry page on desktop (3-column grid with sidebar) and mobile (single column with floating category button).]**

---

## V2: The Platform Vision

### Multi-type registries

The V1 data model was designed for expansion. Registries, categories, items, and purchases share a common schema. Supporting weddings, birthdays, and other occasions means swapping out defaults: different category templates, different labels ("Due date" becomes "Wedding date"), occasion-specific onboarding. The design challenge is making one system feel tailored to each occasion while keeping the underlying mechanics identical.

> **[Visual: Mockups of the registry type selector showing occasion types (Wedding, Birthday, Baby, Housewarming, Custom) with distinct icons and color accents.]**

### Event planning

The bigger expansion connects registries to events. Core features: date/time/location details, digital invitations, RSVP management, and event-registry linking. The key design problem is the host/owner distinction. The person planning the shower usually isn't the person who owns the registry. The host controls the guest list. The owner controls the gift list. Both need visibility without stepping on permissions.

For guests, the goal is one link that shows event info and the linked registry in one page.

> **[Visual: Wireframe of the combined guest-facing page. Event details on top, linked registry below, single shared URL.]**

> **[Visual: IA diagram showing registries and events as peer entities with linking, including one registry with multiple linked events.]**

---

## Key Decisions

| Decision | Chosen approach | Why |
|----------|-----------------|-----|
| Single app vs. separate per occasion | Single app with type-specific templates | Users celebrate multiple milestones. They shouldn't start over each time. |
| Event-registry relationship | Peer entities with linking | The host and owner are often different people. Nesting would conflate their roles. |
| Guest entry point | Combined single-link page | One link. Everything in one place. |
| Host permissions | Scoped to event only | The owner controls gifts. The host manages the party. Clean separation. |

---

## Research

**User interviews** with V1 users explored whether they'd use Regibee for other occasions. Conversations with recent wedding and birthday planners mapped the tools they used and friction points.

**Competitive analysis** covered Zola, MyRegistry, Amazon Registry, and Evite/Partiful. The gap: no one combines registries and events well.

**Card sorting** validated that users think of events and registries as parallel concepts ("my registry" and "my party"), not nested ones.

> **[Visual: Competitive analysis matrix comparing Regibee against 4-5 competitors across: multi-store support, no-signup guests, event planning, cash funds, multi-occasion support.]**

---

## Outcomes and Reflections

**V1 results:** Registries in active use with real purchases end-to-end. Guest conversion validates the no-signup approach. The "Gift this" rename improved completion rates on owner-purchased items.

**What transferred well.** The no-signup guest experience, universal item support, and multi-manager system all carry into V2 without rework.

**What's been hard.** Finding language that works across occasions. "Reserve" fits a baby registry but feels transactional for a wedding. Every label needs re-evaluation per context.

**What I'd do differently.** Test naming earlier. "Cover the cost" persisted for weeks before I realized it was causing hesitation. Small copy changes had outsized impact.

**What's next.** Integrated payments (Stripe), group gifting (splitting big-ticket items), gift recommendations, native mobile app.

> **[Visual: Roadmap showing V1 (shipped) and V2 phases (multi-type registries, event planning, group gifting, payments).]**
