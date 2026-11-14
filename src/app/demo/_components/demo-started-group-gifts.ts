// Group gifts a visitor starts from "Group gift" on a demo list. Starting one
// opens its page, like on the real site. That page is a new page, so this
// keeps the total and payback note typed into the dialog in the browser
// tab's memory for it to show. Nothing is saved or sent anywhere: a reload
// forgets them, and the page then shows the item's price and no note.

export interface StartedGroupGift {
  goalAmount: number | null;
  paybackNote: string | null;
}

const started = new Map<string, StartedGroupGift>();

const PREFIX = "new.";

/** The token for a group gift started in the demo: the list's id and the item's. */
export function startedGroupGiftToken(registryId: string, itemId: string): string {
  return `${PREFIX}${registryId}.${itemId}`;
}

/** The list and item a started group gift's token names, or null when it isn't one. */
export function parseStartedGroupGiftToken(token: string): { registryId: string; itemId: string } | null {
  if (!token.startsWith(PREFIX)) return null;
  const [registryId, itemId, ...rest] = token.slice(PREFIX.length).split(".");
  return registryId && itemId && rest.length === 0 ? { registryId, itemId } : null;
}

export function rememberStartedGroupGift(token: string, details: StartedGroupGift): void {
  started.set(token, details);
}

export function startedGroupGift(token: string): StartedGroupGift | null {
  return started.get(token) ?? null;
}
