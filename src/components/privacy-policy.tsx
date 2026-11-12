import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { EXTENSION_STORES } from "@/lib/retailers";

// The privacy policy at /privacy. The app stores and the Chrome Web Store link
// here, so keep it true to what the code does: when Regibee starts collecting
// something new, sharing it with a new service, or keeping it somewhere new,
// change this page in the same pull request and update EFFECTIVE_DATE.
//
// The nav is passed in because the real one is a server component, which
// Storybook can't render. Stories pass the presentational NavBar instead.

/** Where Regibee is run from, how to reach it, and when this version took effect. */
export const PRIVACY_FACTS = {
  effectiveDate: "November 11, 2026",
  contactEmail: "contact@regibee.com",
  location: "California, United States",
};

// "Amazon, Target, Walmart and Pottery Barn Kids", from the same list the
// extension's site access is built from.
const storeNames = EXTENSION_STORES.map((s) => s.name);
const extensionStores =
  storeNames.length > 1 ? `${storeNames.slice(0, -1).join(", ")} and ${storeNames[storeNames.length - 1]}` : storeNames.join("");

const linkClass =
  "rounded-sm font-medium text-brand-600 underline underline-offset-4 outline-focus-ring hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2";

const sections = [
  { id: "accounts", title: "If you have an account" },
  { id: "guests", title: "If you give a gift, suggest one or RSVP" },
  { id: "app", title: "The Regibee app" },
  { id: "extension", title: "The browser extension" },
  { id: "emails", title: "Emails" },
  { id: "cookies", title: "Cookies and what's stored on your device" },
  { id: "use", title: "How we use it" },
  { id: "sharing", title: "Who else handles it" },
  { id: "your-choices", title: "See, change or delete your information" },
  { id: "keeping", title: "How long we keep it" },
  { id: "security", title: "Security" },
  { id: "children", title: "Children" },
  { id: "changes", title: "Changes to this policy" },
  { id: "contact", title: "Contact us" },
] as const;

type SectionId = (typeof sections)[number]["id"];

function Section({ id, children }: { id: SectionId; children: React.ReactNode }) {
  const title = sections.find((s) => s.id === id)!.title;
  return (
    <section aria-labelledby={id} className="mt-12">
      <h2 id={id} className="scroll-mt-24 font-display text-display-xs font-semibold text-primary">
        {title}
      </h2>
      {children}
    </section>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="mt-6 font-semibold text-primary">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-secondary">{children}</p>;
}

function List({ children }: { children: React.ReactNode }) {
  return <ul className="mt-3 list-disc space-y-2 pl-5 text-secondary marker:text-quaternary">{children}</ul>;
}

function ContactEmail() {
  return (
    <a href={`mailto:${PRIVACY_FACTS.contactEmail}`} className={linkClass}>
      {PRIVACY_FACTS.contactEmail}
    </a>
  );
}

/** The privacy policy page's markup. */
export function PrivacyPolicy({ nav }: { nav: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      {nav}
      <main id="main-content" className="flex-1">
        <article className="container mx-auto max-w-3xl px-4 py-12 sm:py-16">
          <header>
            <h1 className="font-display text-display-sm font-semibold text-primary sm:text-display-md">
              Privacy policy
            </h1>
            <p className="mt-3 text-sm text-tertiary">Effective {PRIVACY_FACTS.effectiveDate}</p>
            <p className="mt-6 text-lg text-secondary">
              Regibee is a gift registry. Owners make registries and events and share them. Guests reserve gifts
              and RSVP without an account. This page says what we collect from each, why, who else handles it,
              and how to see, change or delete it. It covers regibee.com, the Regibee app for iPhone and Android,
              and the Regibee browser extension.
            </p>
          </header>

          <div className="mt-8 rounded-2xl border bg-secondary p-6">
            <h2 className="font-display text-lg font-semibold text-primary">The short version</h2>
            <List>
              <li>We collect what you give us and what Regibee needs to work. That&apos;s all.</li>
              <li>
                There are no ads, and no analytics or tracking cookies on the website, in the app or in the
                extension. Our emails do record whether they&apos;re opened and clicked. We don&apos;t sell your
                information or share it for advertising.
              </li>
              <li>Regibee never handles money. Guests pay owners directly, with Venmo, PayPal, Zelle or however the owner asks.</li>
              <li>
                You can change or delete what you&apos;ve added at any time, and delete your account on your{" "}
                <Link href="/dashboard/account" className={linkClass}>
                  Account page
                </Link>
                .
              </li>
            </List>
          </div>

          <nav aria-label="On this page" className="mt-10">
            <h2 className="text-sm font-semibold text-primary">On this page</h2>
            <ol className="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className={linkClass}>
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <Section id="accounts">
            <H3>Your account</H3>
            <P>
              To make an account you give your name, email address and a password. Supabase, which runs our
              sign-in, keeps only a scrambled form of the password (a hash), so nobody at Regibee can read it.
            </P>

            <H3>Your profile</H3>
            <P>
              Every account has a profile page with your name and the registries you choose to show there. Its
              link has a random code in it, so people find it only if you share it or they find you in search.
              Profiles are hidden from search engines.
            </P>
            <P>
              Signed-in people can find you on Regibee by name, or by typing your whole email address, only if you
              turn that on. It&apos;s the &ldquo;Let friends find me&rdquo; box when you sign up, and two settings
              on your Account page. Search never shows your email address.
            </P>

            <H3>Your registries</H3>
            <List>
              <li>
                What you put on them: the title, date, description and photo, names such as the parents&apos; or the
                guest of honor&apos;s, the items with their links, prices, pictures and notes, your categories and your
                cash funds.
              </li>
              <li>
                Anyone with a registry&apos;s link can open it. Public registries can also show up in search engines.
                Private ones are hidden from search engines, and show on your profile only to people you&apos;ve let
                follow you, or to people in a group you&apos;ve shared them with.
              </li>
              <li>
                Photos you upload for a registry or an item can be seen by anyone with the registry&apos;s link.
              </li>
              <li>
                <strong className="font-semibold text-primary">Shipping address.</strong> If you add one, a guest sees
                it only after they reserve a gift from your registry.
              </li>
              <li>
                <strong className="font-semibold text-primary">Payment handles.</strong> If you add your Venmo, PayPal
                or Zelle details for cash funds, anyone with your registry&apos;s link can see them, because guests
                use them to pay you directly. Regibee never sees or moves the money. When a guest says they sent
                some, we record the amount they tell us.
              </li>
              <li>
                <strong className="font-semibold text-primary">ZIP code.</strong> If you turn on tax estimates, we use
                your ZIP code to estimate sales tax on prices.
              </li>
              <li>Links to your registries at other stores, if you add them.</li>
              <li>
                If you invite someone to help manage a registry, we email them a link. Once they join, they see and
                can change everything on it that you can, gift givers&apos; details included.
              </li>
            </List>

            <H3>Your events</H3>
            <P>
              For an event you add its details, which can include a date, a place and its address, a message, a gift
              note and an invitation picture, questions to ask when guests RSVP, a sign-up sheet, and a guest list
              with names and email addresses. We keep a copy of the messages you email guests, so you can see what
              you sent. You can link
              registries to it, yours or anyone else&apos;s you have the link to, and we email a registry&apos;s
              owners when you link it. Guests opening the event&apos;s link see its details. Event pages are hidden
              from search engines.
            </P>
            <List>
              <li>
                The guest list and the RSVPs are only for you and your co-hosts. You can invite co-hosts by email or
                with a link, and they can manage the event with you.
              </li>
              <li>
                Emails we send for your event, such as invitations, reminders, your messages, updates when its
                details change, Secret Santa names and gift list requests, reply to your email address, so people
                who reply see it.
              </li>
              <li>
                In a gift exchange, you see who has joined and how many have added a wishlist or address, but not
                who drew whom or what anyone added.
              </li>
              <li>
                You can ask the person an event is for to make a gift list. We email them a link, and keep their name
                and email address with the event.
              </li>
            </List>

            <H3>Your groups</H3>
            <P>
              A group is a list of people you keep, like a family or a book club, with their names and, if you add
              them, email addresses. Only you see who&apos;s in it, and we don&apos;t email people when you add them.
              We match members to Regibee accounts by email address. When you share a registry with a group,
              members who have an account see it, with the group&apos;s name, on their Following page and your
              profile, even if the registry is private.
            </P>

            <H3>Following and blocking</H3>
            <P>
              We keep who you follow, who follows you, follow requests and who you&apos;ve blocked. When you search
              for people by name or email, we keep the time of each search, not what you typed, so we can limit
              how many searches one account makes. If you send a follow invite to an email address, we email it and keep
              only a scrambled form of the address, so the same address can&apos;t be invited again and again.
            </P>
          </Section>

          <Section id="guests">
            <P>You don&apos;t need an account to give a gift or RSVP.</P>
            <List>
              <li>
                <strong className="font-semibold text-primary">Giving a gift.</strong> You give your name, your email
                address and, if you like, a message. We record what you gave: the item and how many, or the amount
                you sent to a cash fund. The registry&apos;s owner and anyone helping them manage it see your name,
                email, message and gift. Other guests only see that an item is reserved or given, not by whom. If
                you give from an event&apos;s invitation, the gift is matched to your RSVP.
              </li>
              <li>
                <strong className="font-semibold text-primary">Suggesting an item.</strong> The owners get your
                suggestion with your name and email address.
              </li>
              <li>
                <strong className="font-semibold text-primary">RSVPing.</strong> A host may add your name and email
                address to their guest list to invite you. When you reply, the host and their co-hosts see your
                answer, how many people are coming (and how many are kids, if the host asks) and any note you add.
                They also see your answers to any questions they ask, such as meal choices, allergies or dietary
                needs, and the names of the people coming with you. Other guests don&apos;t. Your personal RSVP link
                has a secret code in it, so keep it to yourself.
              </li>
              <li>
                <strong className="font-semibold text-primary">Sign-up sheets.</strong> If an event has one, you can
                take a spot, like bringing a dish or a meal train day, with a note. Hosts see who took what. Other
                guests see what&apos;s taken, not by whom. A meal train&apos;s drop-off address shows only to guests
                who signed up for a day.
              </li>
              <li>
                <strong className="font-semibold text-primary">Gift exchanges (Secret Santa).</strong> If you join
                one, you can add a wishlist link and gift ideas, and a shipping address when gifts are mailed. Only
                the person who draws your name sees them, and only you see whose name you drew. A gift you give as
                someone&apos;s Secret Santa shows their registry&apos;s owners &ldquo;Secret Santa&rdquo; instead of
                your name and email. We keep those apart, only to send you emails about your gift.
              </li>
              <li>
                When you give a gift or suggest an item, your browser gets an anonymous Regibee session: a random
                ID with no name or email attached. A cookie also remembers which gifts you gave from that browser,
                so the registry can show you your own gifts.
              </li>
            </List>
          </Section>

          <Section id="app">
            <P>
              The app is for registry owners. It signs in to the same account and shows the same registries as the
              website, under the same rules.
            </P>
            <List>
              <li>
                <strong className="font-semibold text-primary">Sharing and pasting products.</strong> When you share
                a product to Regibee or paste a link, the app reads the product&apos;s name, price and pictures on your
                phone. A link from another app, or a pasted one, opens in a hidden browser view on your phone, so the
                store sees a visit from your phone just as if you&apos;d opened the page yourself. Nothing goes to
                Regibee until you save the item.
              </li>
              <li>The app reads your clipboard only when you tap Paste.</li>
              <li>
                <strong className="font-semibold text-primary">Kept on your phone.</strong> Your sign-in session, a
                copy of your registries so the app opens quickly, and the registry you last added to. Signing out
                removes the session and the copy. Deleting the app removes everything it kept.
              </li>
              <li>
                <strong className="font-semibold text-primary">The demo.</strong> &ldquo;Look around first&rdquo;
                shows a sample registry held in the app&apos;s memory. Nothing you do in it is saved or sent to us.
              </li>
              <li>The app doesn&apos;t ask for your location, contacts, camera, photos or microphone.</li>
            </List>
          </Section>

          <Section id="extension">
            <P>
              The Chrome extension brings the items on your registries at {extensionStores} into Regibee. It reads
              pages only in these cases:
            </P>
            <List>
              <li>
                <strong className="font-semibold text-primary">Your store registry pages.</strong> When you open your
                registry at one of those stores, it reads the items on the page: their names, prices, pictures,
                quantities and registry links. It compares them with your Regibee registry. Items are added to
                Regibee when you pick them, or on their own if you turn on automatic mode. Items already on Regibee
                get their store registry links, so gifts bought through Regibee count at the store.
              </li>
              <li>
                <strong className="font-semibold text-primary">The page you&apos;re on, when you ask.</strong> It reads
                a product page only when you click its toolbar button, use its &ldquo;Add to Regibee&rdquo; menu item
                or press its shortcut.
              </li>
              <li>
                <strong className="font-semibold text-primary">Links you paste on regibee.com.</strong> When you paste
                a link from one of those stores while adding an item, the extension may open it in a background tab,
                read the product, and close the tab.
              </li>
            </List>
            <P>
              It doesn&apos;t read any other pages or your browsing history. In your browser it keeps its own Regibee
              session, your name and email address, your list of registries, and which store items you&apos;ve
              already seen. Disconnecting the extension removes them, and removing it from Chrome removes
              everything it kept.
            </P>
          </Section>

          <Section id="emails">
            <P>
              We send account emails, such as confirming your address and resetting your password. We also send
              emails from notifications@regibee.com about things people do on Regibee:
            </P>
            <List>
              <li>to owners, when someone gives a gift, sends money to a fund, suggests an item, or RSVPs;</li>
              <li>
                to guests, to confirm a gift or an RSVP, to remind them before a reservation ends, to invite them to
                an event, with the host&apos;s messages and any changes to it, and to remind them the day before;
              </li>
              <li>
                to people invited to help manage a registry or co-host an event, and to people someone asks to
                follow;
              </li>
              <li>to gift exchange members, with the name they drew;</li>
              <li>to the person an event is for, when its host asks them to make a gift list;</li>
              <li>
                to owners when someone links their registry to an event, or when a store&apos;s completion discount
                for their registry may be open.
              </li>
            </List>
            <P>
              You can turn off follow request emails on your Account page, and RSVP emails for each event you host.
            </P>
            <P>
              Our email service, Resend, records when one of our emails is opened and which of its links are
              clicked. It does this with a tiny image in the email, and by sending links through its own address on
              the way to where they go. Your email app may block the image. We look at this only to check that our
              emails arrive and work, never for advertising.
            </P>
          </Section>

          <Section id="cookies">
            <List>
              <li>Sign-in cookies keep you signed in, and keep a guest&apos;s anonymous session.</li>
              <li>A cookie remembers the gifts a guest gave from that browser, for up to a year.</li>
              <li>
                When a guest opens a gift link from an event invitation, a cookie remembers who they are for up to
                60 days, so the gift form fills in their name and email.
              </li>
              <li>
                There are no analytics, advertising or tracking cookies, and no tracking scripts. Our fonts load from
                regibee.com itself.
              </li>
            </List>
            <P>The app and the extension keep the things listed in their sections above.</P>
            <P>
              Regibee doesn&apos;t follow you across other sites, and doesn&apos;t let advertising or analytics companies
              collect information about you on Regibee. So a browser&apos;s &ldquo;Do Not Track&rdquo; setting has
              nothing to turn off here.
            </P>
          </Section>

          <Section id="use">
            <P>We use your information only to run Regibee:</P>
            <List>
              <li>to show your registries, events and profile to the people you share them with;</li>
              <li>to record gifts and RSVPs, and tell the right people about them;</li>
              <li>to send the emails above;</li>
              <li>to keep accounts secure, stop abuse such as mass searches for people, and fix problems.</li>
            </List>
            <P>We don&apos;t use it to build advertising profiles, and we don&apos;t sell it.</P>
          </Section>

          <Section id="sharing">
            <P>These services handle information for us, only to run Regibee:</P>
            <List>
              <li>
                <strong className="font-semibold text-primary">Supabase</strong> stores the database and uploaded
                photos, and runs sign-in.
              </li>
              <li>
                <strong className="font-semibold text-primary">Vercel</strong> hosts the website and runs its server.
              </li>
              <li>
                <strong className="font-semibold text-primary">Resend</strong> sends our notification emails and
                records whether they&apos;re opened and clicked.
              </li>
            </List>
            <P>
              Like most websites, these services keep logs of requests, such as IP addresses and times, to keep
              things running and secure.
            </P>
            <P>Some things reach other sites because of how the web works:</P>
            <List>
              <li>
                When you paste a product link on regibee.com, our server opens that page to read the product.
              </li>
              <li>
                Item pictures often load from the store that hosts them, so that store sees the request when you view
                a registry.
              </li>
              <li>
                Links to stores, Venmo, PayPal, maps and calendars take you to those services, and their own privacy
                policies apply there.
              </li>
            </List>
            <P>
              We&apos;ll share information with anyone else only if you ask us to, or if the law requires it.
            </P>
          </Section>

          <Section id="your-choices">
            <List>
              <li>
                <strong className="font-semibold text-primary">See and change.</strong> Edit your registries, items,
                funds and events wherever you see them on your dashboard. Change your name and how people can find
                you on your{" "}
                <Link href="/dashboard/account" className={linkClass}>
                  Account page
                </Link>
                .
              </li>
              <li>
                <strong className="font-semibold text-primary">Delete.</strong> Delete items, registries and events
                whenever you like. Delete your whole account on your{" "}
                <Link href="/dashboard/account" className={linkClass}>
                  Account page
                </Link>
                , or on the Account tab in the app. That deletes your sign-in and profile, your follows, follow
                requests and blocks, your groups, and the events you made with their guest lists and RSVPs. It signs you out of
                the website, the app and the extension.
              </li>
              <li>
                <strong className="font-semibold text-primary">Your registries when you delete your account.</strong>{" "}
                A registry only you manage is deleted with its items, funds, photos, suggestions and the gifts
                guests gave on it. A registry you share goes to the person who joined first in helping you manage
                it, with everything on it. Registries you only help manage stay with their owner, and you lose access.
              </li>
              <li>
                <strong className="font-semibold text-primary">Gifts and RSVPs.</strong> These stay with the registry
                or event they were for. They aren&apos;t tied to an account, even if you have one, because we only
                have the name and email you typed. To have yours removed, ask the owner, or email us.
              </li>
              <li>
                <strong className="font-semibold text-primary">Anything else.</strong> Email us at <ContactEmail /> for
                a copy of your information, or for anything you can&apos;t do yourself. We&apos;ll reply within 30
                days.
              </li>
            </List>
            <P>
              Depending on where you live, the law may give you more rights over your information, such as getting
              a copy of it, correcting it, deleting it or objecting to how it&apos;s used. You can use any of them by
              emailing us, and we won&apos;t treat you differently for doing so.
            </P>
          </Section>

          <Section id="keeping">
            <P>
              We keep your information until you delete it or your account. Gifts, suggestions and RSVPs stay with
              the registry or event they were for until its owner deletes it. Deleted information can stay in our
              providers&apos; backups, and records of emails already sent can stay in our email service&apos;s logs,
              until they expire on those providers&apos; own schedules.
            </P>
          </Section>

          <Section id="security">
            <P>
              Every connection to Regibee is encrypted. Access rules in the database let each person reach only what
              they&apos;re allowed to. Guest lists, gift exchanges, groups, follows and blocks can be read only by our server. No system
              is perfectly secure, so if you find a problem, please email us at <ContactEmail />.
            </P>
          </Section>

          <Section id="children">
            <P>
              Regibee is for adults planning gifts and events, and isn&apos;t meant for children. Please don&apos;t
              use it if you&apos;re under 13. A registry may mention a child, such as a baby&apos;s name, and you
              decide what to put there. If you think a child has given us their information, email us and we&apos;ll
              delete it.
            </P>
          </Section>

          <Section id="changes">
            <P>
              When we change this policy, we&apos;ll update the date at the top. If a change affects how we use
              information you&apos;ve already given us, we&apos;ll tell account holders by email or on the site
              first.
            </P>
          </Section>

          <Section id="contact">
            <P>
              Regibee is run from {PRIVACY_FACTS.location}. Questions and requests about your information go to{" "}
              <ContactEmail />.
            </P>
          </Section>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
