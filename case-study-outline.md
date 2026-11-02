# Regibee: Portfolio Case Study Outline

## Working Title

**Regibee: A Universal Registry and Event Planning Platform**
Designing a flexible registry system that works across life milestones, from baby showers to weddings to birthdays.

---

## 1. Overview / Hook

- **One-liner:** Regibee is a universal registry and event-planning platform that lets people create registries for any occasion, add items from any store, and plan the events around them. The first version launched as a baby registry; the next version expands to weddings, birthdays, graduations, and more.
- **Role:** Sole product designer and front-end developer. Responsible for research, UX/UI design, branding, design system, and full implementation.
- **Timeline:** V1 shipped and in use; V2 (multi-registry types + event planning) in active design and development.
- **Core problem:** Registry tools today are fragmented. Most lock you into a single store. Event planning lives in a separate app. Guests end up juggling multiple links and logins. Regibee consolidates registries and events into one place, with a guest experience that requires no account creation.

---

## 2. Problem Space

### Registry pain points
- Most registries are store-specific (Amazon, Target, Buy Buy Baby). Users who want items from multiple retailers have to maintain separate lists and share separate links.
- Existing universal registries (MyRegistry, Zola) charge fees, have cluttered interfaces, or are scoped to a single occasion type (weddings only, baby only).
- People celebrate many milestones across their lives. There's no single platform that handles a baby registry, a wedding registry, and a birthday wish list without starting over each time.

### Event planning pain points
- Planning a shower, party, or celebration currently requires a separate tool (Evite, Partiful, Paperless Post, or a spreadsheet).
- There's a disconnect between "what to give" (the registry) and "when to gather" (the event). Guests receive separate links and have to context-switch between them.
- Hosts have no unified view of RSVPs, gift progress, and event logistics in one place.

### Guest experience pain points
- Gift givers often need to create accounts on platforms they'll use exactly once.
- When multiple registries exist for the same person, guests aren't sure which link to use or whether items have already been purchased elsewhere.
- There's no feedback loop. Guests don't know if their gift was received or appreciated without separate follow-up.

### Users
| User type | V1 | V2 |
|-----------|-----------|-----------------|
| **Registry owner** | Expecting parents | Anyone celebrating a milestone: couples, birthday honorees, graduates, new homeowners |
| **Event host** | Not supported | Shower hosts, party planners, anyone organizing a celebration tied to a registry |
| **Gift giver / Guest** | Friends and family buying gifts | Anyone invited to an event or browsing a shared registry |

---

## 3. V1: What Shipped

This section establishes the shipped product and the design decisions behind it, before expanding into V2.

### Core features
- **Universal item adding:** Add items from any online store by pasting a URL. The app scrapes product data (title, image, price) using Open Graph, JSON-LD, and meta tag parsing. Users can also add items manually.
- **Curated checklist:** ~125 baby items across 10 categories (Nursery & Sleep, Feeding, Diapering, Gear & Travel, etc.) with fuzzy matching that links checklist items to registry items as they're added.
- **No-signup guest experience:** Gift givers reserve items with just a name and email. No account required. Anonymous Supabase sessions handle the interaction.
- **Persistent buyer identity:** HMAC-signed cookies let returning guests see which items they've already reserved, even across sessions, without requiring login.
- **Cash funds:** Owners create cash funds (e.g., "College fund," "Diaper fund") with Venmo, PayPal, or Zelle as payment methods. Guests contribute directly through their preferred payment app.
- **Concurrency control:** `SELECT FOR UPDATE` prevents two guests from reserving the same item simultaneously.
- **Multi-manager support:** Invite a partner or co-parent as a registry co-owner with an email-based invite system. Both managers receive notifications and can edit the registry.
- **Guest suggestions:** Gift givers can propose items for the registry. Owners review suggestions in a filtered inbox and accept or dismiss them.
- **Email notifications:** Transactional emails (via Resend) for reservations, fund contributions, suggestions, and manager invites. Distinct templates with clear subject lines so owners can triage at a glance.
- **Celebration moments:** Confetti animations and contextual dialogs when guests complete a purchase, with a direct "Purchase this item" link to the retailer so they can buy immediately.
- **Demo registry:** A fully populated sample registry (with product images and an animated panda mascot) that lets prospective users explore the experience before signing up.

### Feature deep-dive: "Gift This" (formerly "Cover the Cost")

A common real-world scenario: parents buy registry items before the shower. Maybe they found a sale, or needed the item sooner than expected. Traditional registries mark these items as "fulfilled" and hide them. But friends and family still want to help offset the cost.

#### The design problem
- How do you let owners mark items they've already bought without removing them from the guest-facing registry?
- How do you communicate "this was already purchased, but you can still contribute" without confusing guests?
- How do you differentiate this action from a standard reservation in the UI?

#### The solution

**Owner flow:**
1. Owner marks an item as "Purchased by you" in the manage dashboard (toggle via ShoppingBag icon).
2. The item stays visible in the registry but shifts to a distinct visual state: light teal background with a "Purchased by parent" tag.
3. Under the hood, `is_parent_purchased` sets `quantity_fulfilled = quantity_needed`, marking it complete while keeping it actionable for guests.

**Guest flow:**
1. Guest sees the item with a "Purchased by parent" tag and teal background, visually distinct from unfulfilled items and items reserved by other guests.
2. Instead of "Reserve this item," the CTA reads "Gift this" in a green button (#09c69a), signaling a different kind of action.
3. Guest enters name, email, and optional message. Same low-friction flow as reserving.
4. On success: the celebration dialog shows the owner's preferred payment methods (Venmo, PayPal, Zelle) so the guest can send money directly. No payment processing in the app.
5. Once covered, the item appears disabled for all other visitors, preventing duplicate contributions.

*Note: This feature was originally called "Cover the cost" and was renamed to "Gift this" after testing showed that simpler, warmer language better communicated the intent and reduced hesitation.*

#### Key design decisions
| Decision | Rationale |
|----------|-----------|
| Keep covered items visible in the registry | Owners shouldn't lose credit for items they bought. Guests benefit from seeing the full picture of what's needed. |
| Distinct green CTA color (#09c69a) | Prevents confusion with "Reserve." Guests immediately understand this is a different action. |
| No quantity selector for covers | Covers reimburse the full purchase. Unlike reserves, where guests may buy 1 of 3 needed, covering is all-or-nothing. |
| Show payment methods on success, not shipping address | Guests need to know *how to pay*, not where to ship. The original design showed the shipping address, but payment methods tested better. |
| Payment happens outside the app | Avoids payment processing complexity. Supports the peer-to-peer payment methods people already use. |
| Distinct email templates with different emoji (gift vs. celebration) | Owners can distinguish "someone covered an item" from "someone reserved a new item" at a glance in their inbox. |
| Covered items show as disabled to other visitors | Respects quantity limits and prevents multiple guests from trying to cover the same item. |

#### Visual states across the app
| View | Unfulfilled item | Guest-reserved item | Owner-purchased item |
|------|-----------------|---------------------|----------------------|
| **Guest view background** | Default white | Dimmed (opacity-60) | Light teal |
| **Guest view tag** | "Most wanted" (if essential) | "Already purchased" | "Purchased by parent" |
| **Guest view CTA** | "Reserve this item" | None (fulfilled) | "Gift this" (green) |
| **Manage view tag** | None | "Purchased by [guest name]" | "Purchased by you" |
| **Manage view toggle** | "Mark as bought by you" | None | "Mark as unpurchased" |

### Feature deep-dive: Reserve Flow Redesign

The original reserve dialog was functional but transactional. It felt like filling out a form. The redesign focused on making the act of giving a gift feel more personal.

#### Changes made
- Added a quantity selector for items where multiple are needed (e.g., "3 packs of onesies")
- Added a "Purchase this item" button in the success dialog that links directly to the retailer, so guests can buy immediately after reserving
- Softened the copy throughout: "You're gifting [item name]!" instead of "Item reserved"
- Showed the registry owner's name in the success state to reinforce the personal connection
- Added confetti and a celebration moment on successful reservation

### Design system highlights
- Teal-based color palette built on OKLCH color space for perceptual uniformity
- Custom "dusky green" accent for interactive elements
- Mobile-first responsive layout with sticky category navigation and scroll-to-top
- Built on React Aria + shadcn/ui for accessibility
- Progressive disclosure: the guest experience is intentionally simple; the owner dashboard surfaces more controls
- Animated panda mascot ("Regibee") appears on purchased items and in the demo experience

### Technical foundation
- **Stack:** Next.js (App Router, Server Components, Server Actions), Supabase (Postgres + RLS + Realtime), Tailwind CSS, Vercel
- **Email:** Resend with custom React email templates, previewed in Storybook
- **Auth:** Supabase Auth with forgot password flow, HMAC-signed buyer cookies for guest identity persistence
- **Scraping:** Open Graph, JSON-LD, and meta tag parsing for universal item adding with smart category auto-fill

---

## 4. V2 Vision: Universal Registries + Event Planning

### 4A. Expanding Registry Types

#### New registry types
- **Wedding registry:** Couples creating a shared wish list
- **Birthday registry:** For kids' birthdays, milestone birthdays, or experience-based wish lists
- **Housewarming, graduation, and custom:** Extensible to any life event
- **Baby registry:** The existing core, now one type among several

#### Design challenges
- Creating a single flexible system that feels tailored to each occasion, without building separate apps for each one
- Category templates that adapt per registry type ("Kitchen & Dining" for weddings vs. "Nursery & Sleep" for baby)
- Language that shifts naturally: "Due date" becomes "Wedding date" or "Party date"
- A theming system that lets owners personalize colors, cover photos, and welcome messages while maintaining brand coherence
- A shared data model underneath: items, purchases, cash funds, and categories work the same way across all types. Only the defaults, labels, and templates change.

#### Key screens to design
- **Registry type selector** during creation
- **Type-specific onboarding** with tailored checklists, suggested categories, and starter prompts
- **Public registry page** that adapts its header, imagery, and language to the registry type
- **Unified dashboard** showing all of a user's registries across different milestones

---

### 4B. Event Planning

#### New capability: events tied to registries
- **Baby showers:** The host (often a friend, not the parent) plans the event
- **Wedding showers / bridal showers:** Pre-wedding celebration planning
- **Birthday parties:** Invitations, RSVPs, and logistics
- **Custom events:** Any gathering that can optionally be linked to a registry

#### Core event features
- **Event details:** Date, time, location (physical or virtual), description, dress code, theme
- **Digital invitations:** Shareable invite link or email invitations that include both event info and the linked registry
- **RSVP management:** Guests respond yes/no/maybe with headcount. Hosts see a live guest list.
- **Event-registry linking:** Every event can link to a registry so guests see "what to bring" alongside "when and where"
- **Host/owner distinction:** The shower host may not be the registry owner (e.g., a friend plans the baby shower, but the parent owns the registry). The system supports this relationship cleanly.
- **Multiple events per registry:** A wedding might have an engagement party, bridal shower, and the wedding itself, all linked to one registry

#### Design challenges
- **Information architecture:** How do events and registries relate in the navigation? The system needs to support two entry points: some users start with "I need a registry" and add an event later; others start with "I'm planning a party" and attach a registry.
- **Permissions:** The registry owner controls the gift list. The event host controls the event details and guest list. When they're different people, the permissions model needs to be clear without being complicated.
- **Guest experience:** A guest receives one link. That page needs to show event info (date, location, RSVP) and the registry (gift list, cash funds) without overwhelming them.
- **Notifications:** Who gets notified about what? Hosts get RSVPs. Owners get gift reservations. Both get updates when relevant. Granular controls are needed.

#### Key screens to design
- **Event creation flow** with option to link an existing registry or create a new one
- **Event detail page (host view):** Manage RSVPs, send reminders, update details
- **Event detail page (guest view):** See event info, RSVP, browse linked registry
- **Combined invite + registry page:** The single shareable link guests receive
- **Host dashboard:** RSVP counts, gift progress, event countdown

---

## 5. Research & Discovery

### Planned and ongoing research
- **User interviews:** Talk to V1 users about whether they'd use Regibee for other occasions. Talk to people who've recently planned weddings, birthday parties, or showers about what tools they used and where the friction was.
- **Competitive analysis:** Zola (wedding), MyRegistry (universal), Amazon Registry, Evite/Partiful (events), Joy (wedding + events). Map feature coverage, pricing models, and UX friction points.
- **Usage data from V1:** What features get the most use? What do users request? Where do guests drop off?
- **Card sorting / IA testing:** Validate how users expect events and registries to be organized relative to each other.
- **Persona development:** Expand beyond "expecting parent" to include couples, birthday celebrants, shower hosts, and frequent gift-givers.

---

## 6. Design Process

### Information architecture
- Sitemap of the expanded app: dashboard, registries (by type), events, settings, public pages
- Navigation model showing how registries and events coexist

### Wireframes & flows
- Registry creation flow with type selection and type-specific onboarding
- Event creation flow (standalone or linked to registry)
- Guest experience flow: single link leading to event info + registry
- Host vs. owner management flows, including the case where they're different people

### Visual design
- How the teal brand extends to other occasions (warmer tones for weddings, brighter tones for birthdays) without losing identity
- Component library additions: event cards, RSVP buttons, guest list tables, countdown widgets
- Theming system for owner customization

### Prototyping & testing
- Key prototypes: registry type selection, combined event + registry guest page, host dashboard
- Usability testing: task-based tests with target users for each registry type

---

## 7. Key Design Decisions

| Decision | Options considered | Chosen approach | Why |
|----------|-------------------|-----------------|-----|
| Registry type system | Separate apps per occasion vs. single flexible app | Single app with type-specific templates | Shared infrastructure reduces engineering cost. Users who celebrate multiple milestones don't have to start over. |
| Event-registry relationship | Events nested inside registries vs. events as a peer entity | Peer entities with linking | Supports hosts who aren't registry owners. Allows multiple events per registry. |
| Guest entry point | Separate event and registry links vs. combined page | Combined shareable page | One link. Less friction. Guests see everything they need in one place. |
| Theming per occasion | Fixed brand colors vs. owner-customizable | Owner-customizable with occasion-based defaults | Owners want their registry to feel personal. Defaults provide a starting point without requiring design decisions. |
| Host permissions | Host = full registry manager vs. scoped host role | Separate host role scoped to event only | The registry owner should control their gift list. The host manages the party. Clear separation. |

---

## 8. Final Designs

Placeholder for high-fidelity screens and interactive prototypes.

- **Registry creation:** Type selector, type-specific onboarding, checklist
- **Event creation:** Form, link-to-registry step, invite preview
- **Guest experience:** Combined event + registry page, RSVP + reserve flow
- **Owner dashboard:** Multi-registry, multi-event overview
- **Host dashboard:** Guest list, RSVP status, linked registry progress
- **Mobile:** Key screens at mobile breakpoints
- **Email templates:** Notification designs for different event types

---

## 9. Outcomes & Impact

### V1 metrics (shareable)
- Number of registries created, items added, purchases completed
- Guest conversion rate (visits to reservations)
- Qualitative feedback from users and gift givers
- Storybook coverage of email templates and edge case states

### V2 success criteria
- Adoption of non-baby registry types (wedding, birthday, housewarming)
- Event creation rate (percentage of registries with a linked event)
- Guest experience: single-link engagement, RSVP completion rate
- Retention: do users return for their next milestone?

---

## 10. Reflections & Next Steps

- **What transferred well:** V1's no-signup guest experience, universal item support, and the multi-manager system all carry directly into V2 without rework. The flexible data model (registries, categories, items, purchases) was designed with expansion in mind.
- **What's been challenging:** Finding the right language and visual cues that work across occasions. "Reserve" makes sense for baby registries but feels transactional for weddings. Every label and CTA needs to be re-evaluated per context.
- **Iteration in practice:** The "Cover the cost" to "Gift this" rename came from observing that the original language made guests hesitate. Small copy changes had measurable impact on completion rates.
- **What's next:** Integrated payments (Stripe), group gifting (splitting a big-ticket item among multiple guests), gift recommendations, registry discovery/search, and a native mobile app.

---

## Appendix: Technical Architecture (Optional)

Include if the audience values full-stack or technical depth.

- **Data model evolution:** How the schema extends with a `registries.type` enum, new `events` and `event_guests` tables, and `event_registry_links` for many-to-many relationships
- **Permissions model:** Row-level security policies for host vs. owner vs. guest, building on the existing RLS infrastructure
- **Real-time features:** Supabase Realtime for live RSVP counts and gift reservation updates
- **Email system:** React-based email templates with Storybook previews for design QA across all notification types
- **Scalability:** Template/checklist system designed so new registry types can be added through configuration, not code changes
