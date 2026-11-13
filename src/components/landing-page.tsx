import Link from "next/link";
import { ArrowRight, Baby, Cake, Gift, Link2, PartyPopper, Shield } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";

// Underlined as well as colored, since they sit inside a line of text. Each
// link stays on one line, so a phone wraps between them instead of inside one.
const demoLinkClass =
  "rounded-sm font-medium whitespace-nowrap text-brand-600 underline underline-offset-4 outline-focus-ring hover:text-brand-700 focus-visible:outline-2 focus-visible:outline-offset-2";

function DashboardButton({ className }: { className?: string }) {
  return (
    <Button size="lg" className={className} asChild>
      <Link href="/dashboard">
        <span className="inline-flex items-center gap-1.5">
          Go to your dashboard
          <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
        </span>
      </Link>
    </Button>
  );
}

// The nav is passed in because the real one is a server component, which
// Storybook can't render; stories pass the presentational NavBar instead.
// Signed-in people already have an account, so instead of sign-up and demo
// buttons they get one button back to their dashboard. The demos stay a line
// of text links under it, for showing someone how Regibee works.
export function LandingPage({ signedIn, nav }: { signedIn: boolean; nav: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      {nav}
      <main id="main-content" className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          {/* Stickers from the illustration set (public/hero). Only the
              occasion-neutral ones (panda, hearts, stars), since this page
              covers every occasion. They need the room beside the headline,
              so they show from xl up; smaller screens get one panda above it. */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 mx-auto hidden max-w-[1440px] xl:block">
            <img src="/hero/star-teal-left.svg" alt="" className="absolute left-[6%] top-[16%] w-[52px] -rotate-6" />
            <img src="/hero/heart-red.svg" alt="" className="absolute left-[12%] top-[46%] w-[64px] -rotate-12" />
            <img src="/hero/heart-yellow.svg" alt="" className="absolute bottom-[14%] left-[5%] w-[44px] rotate-12" />
            <img src="/hero/star-teal-right.svg" alt="" className="absolute right-[5%] top-[14%] w-[48px] rotate-6" />
            <img src="/hero/panda.svg" alt="" className="absolute right-[8%] top-[40%] w-[150px] rotate-6" />
          </div>
          <div className="container relative mx-auto px-4 py-24 text-center">
          <img src="/hero/panda.svg" alt="" aria-hidden="true" className="mx-auto mb-8 h-24 w-auto -rotate-3 xl:hidden" />
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            One Registry,{" "}
            <span className="relative isolate inline-block text-brand-600">
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-[0.06em] -z-10 h-[0.32em] rounded-full bg-sunshine-200"
              />
              Every Occasion
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-tertiary">
            Baby showers, birthdays, Christmas, weddings — build a wishlist with
            items from any store and share a single link. No more juggling
            multiple lists.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            {signedIn ? (
              <DashboardButton />
            ) : (
              <>
                <Button size="lg" asChild>
                  <Link href="/signup">Create Your Registry</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/demo/dashboard">Demo: Owner Dashboard</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/demo">Demo: Gift Giver View</Link>
                </Button>
              </>
            )}
          </div>
          {signedIn && (
            <p className="mt-4 text-sm text-tertiary">
              Or see the demos:{" "}
              <Link href="/demo/dashboard" className={demoLinkClass}>
                Owner dashboard
              </Link>
              {" · "}
              <Link href="/demo" className={demoLinkClass}>
                Gift giver view
              </Link>
            </p>
          )}
          {/* Each occasion gets its own tint from the palette. */}
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-sm font-medium">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blush-100 px-3 py-1 text-blush-700">
              <Baby className="h-4 w-4" /> Baby
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-sunshine-100 px-3 py-1 text-sunshine-900">
              <Cake className="h-4 w-4" /> Birthday
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-mint-100 px-3 py-1 text-mint-800">
              <PartyPopper className="h-4 w-4" /> Christmas
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-brand-700">
              <Gift className="h-4 w-4" /> Any occasion
            </span>
          </div>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t bg-secondary py-24">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-3xl font-bold">How It Works</h2>
            <div className="mt-16 grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blush-100">
                  <Gift className="h-8 w-8 text-brand-600" />
                </div>
                <h3 className="mt-6 font-display text-xl font-semibold">1. Create Your Registry</h3>
                <p className="mt-2 text-tertiary">
                  Pick an occasion — baby shower, birthday, Christmas, wedding,
                  anything — and set up your registry in under 5 minutes.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sunshine-100">
                  <Link2 className="h-8 w-8 text-brand-600" />
                </div>
                <h3 className="mt-6 font-display text-xl font-semibold">2. Add Items From Anywhere</h3>
                <p className="mt-2 text-tertiary">
                  Add products from any online store by pasting a URL, or browse
                  our curated checklist of essentials.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-mint-100">
                  <Gift className="h-8 w-8 text-brand-600" />
                </div>
                <h3 className="mt-6 font-display text-xl font-semibold">3. Share & Receive Gifts</h3>
                <p className="mt-2 text-tertiary">
                  Share your unique registry link. Gift givers can reserve items
                  with no sign-up required.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-3xl font-bold">
              Everything You Need
            </h2>
            <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Link2,
                  title: "Universal Registry",
                  desc: "Add items from Amazon, Target, or any online store into one list.",
                },
                {
                  icon: Shield,
                  title: "No Duplicate Gifts",
                  desc: "Real-time reservations prevent two people from buying the same item.",
                },
                {
                  icon: Gift,
                  title: "Cash Funds",
                  desc: "Set up funds for diapers, college savings, honeymoons, or anything you need.",
                },
                {
                  icon: Baby,
                  title: "Baby Checklist",
                  desc: "Baby registries get a curated list of 100 essentials across 10 categories.",
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-2xl border bg-primary p-6"
                >
                  <feature.icon className="h-6 w-6 text-brand-600" />
                  <h3 className="mt-4 font-display font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm text-tertiary">
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t bg-secondary py-24">
          <div className="container mx-auto px-4 text-center">
            {signedIn ? (
              <>
                <h2 className="text-3xl font-bold">Pick Up Where You Left Off</h2>
                <p className="mt-4 text-tertiary">
                  Your registries, events and the people you follow are all on
                  your dashboard.
                </p>
                <DashboardButton className="mt-8" />
              </>
            ) : (
              <>
                <h2 className="text-3xl font-bold">
                  Ready to Build Your Registry?
                </h2>
                <p className="mt-4 text-tertiary">
                  Join thousands of people who trust Regibee for their registry — baby
                  shower, birthday, Christmas, or anything in between.
                </p>
                <Button size="lg" className="mt-8" asChild>
                  <Link href="/signup">Get Started Free</Link>
                </Button>
              </>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
