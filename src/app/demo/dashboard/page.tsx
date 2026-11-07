"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardRegistryCard } from "@/components/dashboard-registry-card";
import { DEMO_REGISTRY, DEMO_ITEMS } from "@/lib/demo-data";
import { Logo } from "@/components/logo";

export default function DemoDashboardPage() {
  const totalItems = DEMO_ITEMS.length;
  const fulfilledItems = DEMO_ITEMS.filter(
    (i) => i.quantity_fulfilled >= i.quantity_needed
  ).length;
  const totalValue = DEMO_ITEMS.reduce(
    (sum, i) => sum + (i.price || 0),
    0
  );

  const recentActivity = [
    { id: "1", name: "Aunt Linda", item: "Newton Crib Mattress" },
    { id: "2", name: "Grandma Rose", item: "Boppy Nursing Pillow" },
    { id: "3", name: "Uncle Dave", item: "Ergobaby Omni 360 Carrier" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Demo banner */}
      <div className="bg-brand-solid text-white py-2 px-4 text-center text-sm">
        This is a demo dashboard — no account required.{" "}
        <Link href="/signup" className="underline font-medium">
          Create your own registry
        </Link>
      </div>

      <header className="sticky top-0 z-50 w-full border-b bg-primary/95 backdrop-blur supports-[backdrop-filter]:bg-primary/60">
        <div className="container mx-auto flex h-14 items-center px-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold"
          >
            <Logo />
          </Link>
          <nav className="ml-6 hidden items-center gap-4 md:flex">
            <Link
              href="/demo/dashboard"
              className="text-sm font-medium text-primary"
            >
              Dashboard
            </Link>
          </nav>
          <span className="ml-auto text-sm text-tertiary hidden md:inline">
            demo@example.com
          </span>
        </div>
      </header>

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold">My Registries</h1>
              <p className="flex items-start gap-2 text-tertiary">
                <span aria-hidden="true" className="mt-2 size-2 shrink-0 rounded-full bg-mint-500" />
                {recentActivity.length} gifts reserved this week
              </p>
            </div>
            <Button disabled>
              <span className="inline-flex items-center gap-1.5">
                <Plus className="h-4 w-4 shrink-0" />
                New Registry
              </span>
            </Button>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <DashboardRegistryCard
              title={DEMO_REGISTRY.title}
              registryType="baby"
              eventType={null}
              eventDate={DEMO_REGISTRY.event_date}
              today={new Date().toISOString().slice(0, 10)}
              totalItems={totalItems}
              fulfilledItems={fulfilledItems}
              totalValue={totalValue}
              recentActivity={recentActivity.map((p) => ({ id: p.id, name: p.name, action: `reserved ${p.item}` }))}
              manageHref="/demo/manage"
              publicHref="/demo"
            />
          </div>
        </div>
      </main>
    </div>
  );
}
