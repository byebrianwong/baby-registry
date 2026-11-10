"use client";

import Link from "next/link";
import { Plus, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DashboardRegistryCard } from "@/components/dashboard-registry-card";
import { demoOwnRegistries, demoRegistryPath } from "@/lib/demo-registries";
import { DEMO_FOLLOWS } from "@/lib/demo-people";
import { addDays } from "@/lib/demo-data";
import { useDemoToday } from "../demo-today";
import { DemoOwnerShell } from "../_components/demo-shell";
import { DemoTour } from "../_components/demo-tour";

/** The demo's My registries tab. Like src/app/(protected)/dashboard/(tabs)/(overview)/page.tsx. */
export default function DemoDashboardPage() {
  const today = useDemoToday();
  const registries = demoOwnRegistries(today);
  const weekAgo = `${addDays(today, -7)}T00:00:00Z`;
  const giftsThisWeek = registries
    .flatMap((r) => r.purchases)
    .filter((p) => p.status !== "cancelled" && p.created_at >= weekAgo).length;
  const requestCount = DEMO_FOLLOWS.requests.length;

  return (
    <DemoOwnerShell tabs>
      <div className="container mx-auto px-4 pt-6 pb-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="sr-only">My Registries</h1>
            <p className="flex items-start gap-2 text-tertiary">
              <span aria-hidden="true" className="mt-2 size-2 shrink-0 rounded-full bg-mint-500" />
              {giftsThisWeek === 1 ? "1 gift reserved this week" : `${giftsThisWeek} gifts reserved this week`}
            </p>
          </div>
          {/* The demo can't make registries, so this is where you make your own. */}
          <Button asChild>
            <Link href="/signup">
              <span className="inline-flex items-center gap-1.5">
                <Plus className="h-4 w-4 shrink-0" />
                New Registry
              </span>
            </Link>
          </Button>
        </div>

        <div className="mt-6">
          <DemoTour />
        </div>

        {requestCount > 0 && (
          <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-blush-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary">
                <UserPlus aria-hidden="true" className="h-4.5 w-4.5 text-blush-700" />
              </span>
              <div>
                <p className="font-medium">
                  {requestCount === 1 ? "1 person wants to follow you" : `${requestCount} people want to follow you`}
                </p>
                <p className="text-sm text-tertiary">
                  People you approve can see the private registries on your profile.
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" className="shrink-0" asChild>
              <Link href="/demo/dashboard/account#follows">Review requests</Link>
            </Button>
          </div>
        )}

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {registries.map((registry) => {
            const recent = [...registry.purchases]
              .filter((p) => p.status !== "cancelled")
              .sort((a, b) => b.created_at.localeCompare(a.created_at))
              .slice(0, 3);
            return (
              <DashboardRegistryCard
                key={registry.id}
                title={registry.title}
                registryType={registry.registry_type}
                eventType={registry.event_type}
                eventDate={registry.event_date}
                today={today}
                totalItems={registry.items.length}
                fulfilledItems={registry.items.filter((i) => i.quantity_fulfilled >= i.quantity_needed).length}
                totalValue={registry.items.reduce((sum, i) => sum + (i.price || 0), 0)}
                recentActivity={recent.map((p) => ({
                  id: p.id,
                  name: p.buyer_name,
                  action: p.cash_fund_id ? `gave to ${p.item_title}` : `reserved ${p.item_title}`,
                }))}
                manageHref={`/demo/dashboard/registry/${registry.id}`}
                publicHref={demoRegistryPath(registry)}
              />
            );
          })}
        </div>
      </div>
    </DemoOwnerShell>
  );
}
