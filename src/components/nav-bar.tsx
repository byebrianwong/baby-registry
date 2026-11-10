"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

// Only signed-in people see the account menu, so it's a separate download.
// It still renders on the server, and its code is preloaded with the page.
const AccountMenu = dynamic(() => import("@/components/account-menu").then((m) => m.AccountMenu));

export interface NavAccount {
  name: string;
  /** Link to the account's profile page. */
  profilePath: string;
  email: string | null;
  followRequestCount: number;
}

// Signed-in people get just the logo and their account menu. The logo goes to
// the dashboard, where My registries, Events and Following are tabs
// (src/components/dashboard-tabs.tsx).
export function NavBar({ account }: { account: NavAccount | null }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-secondary bg-primary/95 backdrop-blur supports-[backdrop-filter]:bg-primary/80">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary focus:shadow-lg focus:outline-2 focus:outline-focus-ring"
      >
        Skip to main content
      </a>

      <div className="container mx-auto flex h-16 items-center gap-6 px-4">
        <Link
          href={account ? "/dashboard" : "/"}
          className="flex items-center gap-2 rounded-md font-semibold text-primary outline-focus-ring focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          <Logo />
        </Link>

        <div className="ml-auto flex items-center gap-2">
          {account ? (
            <AccountMenu account={account} />
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button
                size="sm"
                asChild
              >
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
