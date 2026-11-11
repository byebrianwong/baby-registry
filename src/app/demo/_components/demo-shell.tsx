"use client";

import Link from "next/link";
import { DashboardTabs } from "@/components/dashboard-tabs";
import { NavBar } from "@/components/nav-bar";
import { PoweredByFooter } from "@/components/site-footer";
import { DEMO_FOLLOWS, DEMO_ME, demoProfilePath } from "@/lib/demo-people";

/** The strip across the top of every demo page. */
export function DemoBanner() {
  return (
    <div className="bg-brand-solid px-4 py-2 text-center text-sm text-white">
      This is a demo with sample data. Try anything: nothing is saved.{" "}
      <Link href="/signup" className="font-medium underline">
        Create your own registry
      </Link>
    </div>
  );
}

/**
 * The owner's side of the demo, as Remi & Max see it: the real top bar, and
 * on the tab pages, the dashboard tabs. Links stay under /demo.
 */
export function DemoOwnerShell({ tabs = false, children }: { tabs?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <DemoBanner />
      <NavBar
        demo
        account={{
          name: DEMO_ME.full_name,
          profilePath: demoProfilePath(DEMO_ME),
          email: DEMO_ME.email,
          followRequestCount: DEMO_FOLLOWS.requests.length,
        }}
      />
      <main id="main-content" className="flex-1">
        {tabs && <DashboardTabs hasAccount basePath="/demo" />}
        {children}
      </main>
    </div>
  );
}

/** The guest side of the demo: just the logo, like a shared registry or event page. */
export function DemoGuestShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-primary">
      <DemoBanner />
      {children}
      <PoweredByFooter />
    </div>
  );
}
