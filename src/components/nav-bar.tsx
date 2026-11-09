"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Settings, UserPlus, UserRound } from "lucide-react";
import { Button as AriaButton, RouterProvider } from "react-aria-components";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { initialsFor } from "@/lib/initials";
import { cx } from "@/lib/utils/cx";
import { createClient } from "@/utils/supabase/client";
import { Logo } from "@/components/logo";

export interface NavAccount {
  name: string;
  /** Link to the account's profile page. */
  profilePath: string;
  email: string | null;
  followRequestCount: number;
}

function AccountMenu({ account }: { account: NavAccount }) {
  const router = useRouter();
  const count = account.followRequestCount;
  const requestLabel = count === 1 ? "1 follow request" : `${count} follow requests`;

  const signOut = async () => {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <RouterProvider navigate={router.push}>
      <Dropdown.Root>
        <AriaButton
          aria-label={count > 0 ? `Account menu, ${requestLabel}` : "Account menu"}
          className={({ isFocusVisible, isHovered, isPressed }) =>
            cx(
              "relative flex cursor-pointer items-center gap-1 rounded-full p-1 outline-focus-ring transition-colors",
              (isHovered || isPressed) && "bg-secondary",
              isFocusVisible && "outline-2 outline-offset-2",
            )
          }
        >
          <Avatar size="lg">
            <AvatarFallback className="font-medium text-secondary">{initialsFor(account.name)}</AvatarFallback>
          </Avatar>
          <ChevronDown aria-hidden="true" className="hidden h-4 w-4 text-tertiary md:block" />
          {count > 0 && (
            <span
              aria-hidden="true"
              className="absolute top-1 left-8 h-2.5 w-2.5 rounded-full bg-error-solid ring-2 ring-bg-primary"
            />
          )}
        </AriaButton>
        <Dropdown.Popover placement="bottom end" className="w-64">
          <div className="border-b border-secondary px-4 py-3">
            <p className="truncate text-sm font-semibold text-primary">{account.name}</p>
            {account.email && <p className="truncate text-sm text-tertiary">{account.email}</p>}
          </div>
          <Dropdown.Menu
            aria-label="Account"
            selectionMode="none"
            onAction={(key) => {
              if (key === "sign-out") signOut();
            }}
          >
            <Dropdown.Item id="profile" href={account.profilePath} icon={UserRound} label="Your profile" />
            <Dropdown.Item
              id="requests"
              href="/dashboard/account#follows"
              icon={UserPlus}
              label="Follow requests"
              addon={count > 0 ? String(count) : undefined}
            />
            <Dropdown.Item id="account" href="/dashboard/account" icon={Settings} label="Account settings" />
            <Dropdown.Separator />
            <Dropdown.Item id="sign-out" icon={LogOut} label="Sign out" />
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown.Root>
    </RouterProvider>
  );
}

// Signed-in people get just the logo and their account menu. The logo goes to
// the dashboard, where My registries and Following are tabs
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
