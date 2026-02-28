"use client";

import Link from "next/link";
import { Baby, Plus, Calendar, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { DEMO_REGISTRY, DEMO_ITEMS } from "@/lib/demo-data";

export default function DemoDashboardPage() {
  const totalItems = DEMO_ITEMS.length;
  const fulfilledItems = DEMO_ITEMS.filter(
    (i) => i.quantity_fulfilled >= i.quantity_needed
  ).length;
  const progress =
    totalItems > 0 ? (fulfilledItems / totalItems) * 100 : 0;
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
            href="/demo/dashboard"
            className="flex items-center gap-2 font-semibold"
          >
            <Baby className="h-5 w-5 text-brand-600" />
            <span>Baby Akachan</span>
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">My Registries</h1>
              <p className="text-tertiary">
                Manage your baby registries and track gifts
              </p>
            </div>
            <Button disabled>
              <Plus className="mr-2 h-4 w-4" />
              New Registry
            </Button>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <Link
                    href="/demo/manage"
                    className="hover:underline"
                  >
                    {DEMO_REGISTRY.title}
                  </Link>
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <Calendar className="h-3 w-3" />
                  {new Date(
                    DEMO_REGISTRY.event_date
                  ).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>
                        {fulfilledItems} of {totalItems} items
                        fulfilled
                      </span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>

                  <div className="flex justify-between text-sm text-tertiary">
                    <span>{totalItems} items</span>
                    <span>${totalValue.toFixed(0)} total value</span>
                  </div>

                  <div className="text-sm">
                    <p className="font-medium mb-1">Recent activity:</p>
                    {recentActivity.map((p) => (
                      <p
                        key={p.id}
                        className="text-tertiary"
                      >
                        {p.name} reserved {p.item}
                      </p>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      asChild
                    >
                      <Link href="/demo/manage">Manage</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/demo" target="_blank">
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
