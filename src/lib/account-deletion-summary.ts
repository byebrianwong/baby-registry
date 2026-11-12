// What deleting an account does, in words, for the confirmation on the
// website (src/components/delete-account-card.tsx) and in the app
// (mobile/src/lib/account.ts). The server works it out in
// src/lib/account-deletion.ts, and GET /api/account returns it.
//
// The app imports this file through @shared/*, so it must not import anything.

export interface AccountDeletionSummary {
  /** Registries nobody else manages. They're deleted with everything on them. */
  deleted: { title: string; gifts: number }[];
  /**
   * Registries the account owns that other people help manage. They stay, and
   * the co-manager who joined first becomes the owner.
   */
  handedOver: { title: string; newOwner: string }[];
  /** Registries the account helps manage for someone else. They stay with their owner. */
  leaving: { title: string }[];
  /** How many events the account made. They're deleted with their guest lists. */
  events: number;
}

/** One sentence per thing that happens, in the order the confirmation lists them. */
export function accountDeletionLines(summary: AccountDeletionSummary): string[] {
  const lines: string[] = [];

  for (const registry of summary.deleted) {
    const gifts =
      registry.gifts === 0
        ? ""
        : registry.gifts === 1
          ? ", including the gift a guest reserved or gave"
          : `, including the ${registry.gifts} gifts guests reserved or gave`;
    lines.push(`“${registry.title}” is deleted, with its items and gift funds${gifts}. Its link stops working.`);
  }

  for (const registry of summary.handedOver) {
    lines.push(`“${registry.title}” stays for the people who help manage it. ${registry.newOwner} becomes its owner.`);
  }

  for (const registry of summary.leaving) {
    lines.push(`You stop helping manage “${registry.title}”. It stays with its owner.`);
  }

  if (summary.events > 0) {
    lines.push(
      summary.events === 1
        ? "Your event is deleted, with its guest list and RSVPs."
        : `Your ${summary.events} events are deleted, with their guest lists and RSVPs.`,
    );
  }

  lines.push(
    "Your profile, the people you follow and your followers are deleted, and you're signed out everywhere, the browser extension included.",
  );

  return lines;
}
