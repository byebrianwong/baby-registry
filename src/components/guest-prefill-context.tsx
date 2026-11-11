"use client";

import { createContext, useContext, type ReactNode } from "react";

// A guest who comes to a registry from a gift link on their event invitation
// has already given their name and email. The registry page passes them here,
// and the gift dialogs start with those fields filled in. The guest can still
// change them.
//
// With no provider, as on the demo pages, the dialogs work as before: empty
// fields and the usual wording.

export interface GuestPrefill {
  name: string;
  email: string | null;
  /**
   * True when the guest is the Secret Santa of this list's owner. A gift they
   * give here shows the owners "Secret Santa" instead of their name, so the
   * dialogs don't say the owners will see it's from them.
   */
  secretGiver?: boolean;
}

const GuestPrefillContext = createContext<GuestPrefill | null>(null);

export function GuestPrefillProvider({
  value,
  children,
}: {
  value: GuestPrefill | null;
  children: ReactNode;
}) {
  return <GuestPrefillContext.Provider value={value}>{children}</GuestPrefillContext.Provider>;
}

/** The guest's details for the gift forms, or null when there are none. */
export function useGuestPrefill(): GuestPrefill | null {
  return useContext(GuestPrefillContext);
}
