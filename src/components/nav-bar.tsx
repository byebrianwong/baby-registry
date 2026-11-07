"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Baby, ChevronDown, LogOut, Settings, UserPlus, UserRound } from "lucide-react";
import { Button as AriaButton, RouterProvider } from "react-aria-components";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { initialsFor } from "@/lib/initials";
import { cx } from "@/lib/utils/cx";
import { createClient } from "@/utils/supabase/client";

export interface NavAccount {
  name: string;
  username: string | null;
  email: string | null;
  followRequestCount: number;
}

// Labels match the page titles, and each section stays highlighted on the
// pages inside it.
const SECTIONS = [
  {
    href: "/dashboard",
    label: "My registries",
    isActive: (path: string) => path === "/dashboard" || path.startsWith("/dashboard/registry"),
  },
  {
    href: "/dashboard/following",
    label: "Following",
    isActive: (path: string) => path.startsWith("/dashboard/following"),
  },
];

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
            <p className="truncate text-sm text-tertiary">
              {account.username ? `@${account.username}` : account.email}
            </p>
          </div>
          <Dropdown.Menu
            aria-label="Account"
            selectionMode="none"
            onAction={(key) => {
              if (key === "sign-out") signOut();
            }}
          >
            {account.username ? (
              <Dropdown.Item id="profile" href={`/u/${account.username}`} icon={UserRound} label="Your profile" />
            ) : (
              <Dropdown.Item id="profile" href="/dashboard/account" icon={UserRound} label="Set up your profile" />
            )}
            {account.username && (
              <Dropdown.Item
                id="requests"
                href="/dashboard/account#follows"
                icon={UserPlus}
                label="Follow requests"
                addon={count > 0 ? String(count) : undefined}
              />
            )}
            <Dropdown.Item id="account" href="/dashboard/account" icon={Settings} label="Account settings" />
            <Dropdown.Separator />
            <Dropdown.Item id="sign-out" icon={LogOut} label="Sign out" />
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown.Root>
    </RouterProvider>
  );
}

export function NavBar({ account }: { account: NavAccount | null }) {
  const pathname = usePathname() ?? "";

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
          <Baby aria-hidden="true" className="h-5 w-5 text-brand-600" />
          <span>Regibee</span>
        </Link>

        {account && (
          <nav aria-label="Main" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {SECTIONS.map((section) => {
                const active = section.isActive(pathname);
                return (
                  <li key={section.href}>
                    <Link
                      href={section.href}
                      aria-current={active ? "page" : undefined}
                      className={cx(
                        "rounded-md px-3 py-2 text-sm font-medium outline-focus-ring transition-colors focus-visible:outline-2",
                        active ? "bg-secondary text-primary" : "text-tertiary hover:bg-secondary hover:text-primary",
                      )}
                    >
                      {section.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}

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
                className="!bg-[#004659] hover:!bg-[#003847] !ring-[#004659] !text-white"
                asChild
              >
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Phones get the same two sections as full-width tabs instead of a
          hidden menu, so they stay one tap away. */}
      {account && (
        <nav aria-label="Main" className="border-t border-secondary md:hidden">
          <ul className="container mx-auto flex px-4">
            {SECTIONS.map((section) => {
              const active = section.isActive(pathname);
              return (
                <li key={section.href} className="flex-1">
                  <Link
                    href={section.href}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "-mb-px flex min-h-11 items-center justify-center border-b-2 text-sm font-medium outline-focus-ring focus-visible:outline-2 focus-visible:-outline-offset-2",
                      active ? "border-[#004659] text-primary" : "border-transparent text-tertiary",
                    )}
                  >
                    {section.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </header>
  );
}
