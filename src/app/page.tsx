import Link from "next/link";
import { Baby, Cake, Gift, Link2, PartyPopper, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Nav } from "@/components/nav";
import { createClient } from "@/utils/supabase/server";

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const ctaHref = user ? "/dashboard" : "/signup";
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1">
        {/* Hero */}
        <section className="container mx-auto px-4 py-24 text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
            One Registry,{" "}
            <span className="text-brand-600">Every Occasion</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-tertiary">
            Baby showers, birthdays, Christmas, weddings — build a wishlist with
            items from any store and share a single link. No more juggling
            multiple lists.
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button size="lg" asChild>
              <Link href={ctaHref}>Create Your Registry</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/demo/dashboard">Demo: Owner Dashboard</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/demo">Demo: Gift Giver View</Link>
            </Button>
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-sm text-tertiary">
            <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1">
              <Baby className="h-4 w-4" /> Baby
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1">
              <Cake className="h-4 w-4" /> Birthday
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1">
              <PartyPopper className="h-4 w-4" /> Christmas
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1">
              <Gift className="h-4 w-4" /> Any occasion
            </span>
          </div>
        </section>

        {/* How it works */}
        <section className="border-t bg-secondary py-24">
          <div className="container mx-auto px-4">
            <h2 className="text-center text-3xl font-bold">How It Works</h2>
            <div className="mt-16 grid gap-8 md:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-600/10">
                  <Gift className="h-8 w-8 text-brand-600" />
                </div>
                <h3 className="mt-6 text-xl font-semibold">1. Create Your Registry</h3>
                <p className="mt-2 text-tertiary">
                  Pick an occasion — baby shower, birthday, Christmas, wedding,
                  anything — and set up your registry in under 5 minutes.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-600/10">
                  <Link2 className="h-8 w-8 text-brand-600" />
                </div>
                <h3 className="mt-6 text-xl font-semibold">2. Add Items From Anywhere</h3>
                <p className="mt-2 text-tertiary">
                  Add products from any online store by pasting a URL, or browse
                  our curated checklist of essentials.
                </p>
              </div>
              <div className="text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-600/10">
                  <Gift className="h-8 w-8 text-brand-600" />
                </div>
                <h3 className="mt-6 text-xl font-semibold">3. Share & Receive Gifts</h3>
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
                  desc: "Baby registries get a curated list of 125+ essentials across 10 categories.",
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-lg border p-6"
                >
                  <feature.icon className="h-6 w-6 text-brand-600" />
                  <h3 className="mt-4 font-semibold">{feature.title}</h3>
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
            <h2 className="text-3xl font-bold">
              Ready to Build Your Registry?
            </h2>
            <p className="mt-4 text-tertiary">
              Join thousands of people who trust Regibee for their registry — baby
              shower, birthday, Christmas, or anything in between.
            </p>
            <Button size="lg" className="mt-8" asChild>
              <Link href={ctaHref}>Get Started Free</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-tertiary">
          &copy; {new Date().getFullYear()} Regibee. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
