"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Settings, UserPlus, UserRound } from "lucide-react";
import { Button as AriaButton, RouterProvider } from "react-aria-components";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dropdown } from "@/components/base/dropdown/dropdown";
import { initialsFor } from "@/lib/initials";
import { cx } from "@/lib/utils/cx";
import type { NavAccount } from "@/components/nav-bar";

// The account menu in the top bar. nav-bar.tsx loads it on its own, so
// signed-out visitors don't download the menu code.
export function AccountMenu({ account, basePath, demo }: { account: NavAccount; basePath: string; demo: boolean }) {
  const router = useRouter();
  const count = account.followRequestCount;
  const requestLabel = count === 1 ? "1 follow request" : `${count} follow requests`;

  const signOut = async () => {
    // The demo has no session to end. Leaving it goes back to the home page.
    if (!demo) {
      // The Supabase client is a big download, and signing out is the only
      // thing on most pages that needs it in the browser, so it loads on the
      // click.
      const { createClient } = await import("@/utils/supabase/client");
      await createClient().auth.signOut();
    }
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
              href={`${basePath}/dashboard/account#follows`}
              icon={UserPlus}
              label="Follow requests"
              addon={count > 0 ? String(count) : undefined}
            />
            <Dropdown.Item id="account" href={`${basePath}/dashboard/account`} icon={Settings} label="Account settings" />
            <Dropdown.Separator />
            <Dropdown.Item id="sign-out" icon={LogOut} label={demo ? "Leave the demo" : "Sign out"} />
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown.Root>
    </RouterProvider>
  );
}
