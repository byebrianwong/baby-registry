// The people in the demo: the demo account (Remi & Max), who they follow, and
// who follows them. Nothing here is saved anywhere. Pages copy it into their
// own state, so following or approving someone lasts until you leave the page.

import type { SearchResponse, SearchResult } from "@/lib/actions/follows";
import type { FollowPerson, PersonSummary } from "@/lib/follows";
import { looksLikeEmail } from "@/lib/email-address";
import { profilePath } from "@/lib/profile-link";

export interface DemoPerson extends PersonSummary {
  full_name: string;
  email: string;
  /** Shows up when someone searches by name. */
  discoverable: boolean;
  /** Shows up when someone types this whole email address. */
  findable_by_email: boolean;
}

/** The demo account. */
export const DEMO_ME: DemoPerson = {
  public_id: "k7m2p9qx4t",
  full_name: "Remi & Max",
  email: "demo@example.com",
  discoverable: true,
  findable_by_email: true,
};

export const DEMO_GLINDA: DemoPerson = {
  public_id: "g4n8r2wd6h",
  full_name: "Glinda Upland",
  email: "glinda@example.com",
  discoverable: true,
  findable_by_email: true,
};

export const DEMO_OZ: DemoPerson = {
  public_id: "z5t7q3mc9k",
  full_name: "Oz Diggs",
  email: "oz@example.com",
  discoverable: true,
  findable_by_email: false,
};

export const DEMO_ELPHABA: DemoPerson = {
  public_id: "e2h6w9pa4r",
  full_name: "Elphaba Thropp",
  email: "elphie@example.com",
  discoverable: true,
  findable_by_email: true,
};

export const DEMO_DOROTHY: DemoPerson = {
  public_id: "d3r7k5ty9b",
  full_name: "Dorothy Gale",
  email: "dorothy@example.com",
  discoverable: true,
  findable_by_email: true,
};

export const DEMO_HENRY: DemoPerson = {
  public_id: "h8j2v6sn4f",
  full_name: "Henry Gale",
  email: "henry@example.com",
  discoverable: true,
  findable_by_email: false,
};

export const DEMO_NESSA: DemoPerson = {
  public_id: "n5c9x3gb7m",
  full_name: "Nessa Thropp",
  email: "nessa@example.com",
  discoverable: false,
  findable_by_email: true,
};

export const DEMO_PEOPLE: DemoPerson[] = [
  DEMO_ME,
  DEMO_GLINDA,
  DEMO_OZ,
  DEMO_ELPHABA,
  DEMO_DOROTHY,
  DEMO_HENRY,
  DEMO_NESSA,
];

function summary(person: DemoPerson): PersonSummary {
  return { public_id: person.public_id, full_name: person.full_name };
}

function withStatus(person: DemoPerson, status: FollowPerson["status"]): FollowPerson {
  return { ...summary(person), status };
}

/** The demo account's follows, as the Account page lists them. */
export const DEMO_FOLLOWS = {
  /** People asking to follow Remi & Max. */
  requests: [withStatus(DEMO_DOROTHY, "pending"), withStatus(DEMO_NESSA, "pending")],
  /** People Remi & Max approved. */
  followers: [withStatus(DEMO_GLINDA, "approved"), withStatus(DEMO_HENRY, "approved")],
  /** People Remi & Max follow. Elphaba hasn't approved yet. */
  following: [
    withStatus(DEMO_GLINDA, "approved"),
    withStatus(DEMO_OZ, "approved"),
    withStatus(DEMO_ELPHABA, "pending"),
  ],
  blocked: [] as PersonSummary[],
};

/** How the demo account stands with someone: the Follow button's state. */
export function demoFollowState(publicId: string): SearchResult["state"] {
  if (publicId === DEMO_ME.public_id) return "self";
  return DEMO_FOLLOWS.following.find((p) => p.public_id === publicId)?.status ?? "none";
}

export function findDemoPerson(publicId: string): DemoPerson | null {
  return DEMO_PEOPLE.find((p) => p.public_id === publicId) ?? null;
}

export function demoProfilePath(person: PersonSummary): string {
  return `/demo${profilePath(person)}`;
}

/**
 * The people search, over the demo's people. Like the real one, a name
 * matches people who chose to be in search, and an email address matches
 * only a whole address whose owner allowed it.
 */
export async function demoSearchPeople(rawQuery: string): Promise<SearchResponse> {
  const query = rawQuery.trim().toLowerCase();
  if (query.includes("@")) {
    if (!looksLikeEmail(query)) return { results: [], kind: "email", error: "Enter a whole email address." };
    const match = DEMO_PEOPLE.find((p) => p.findable_by_email && p.email === query);
    return {
      kind: "email",
      results: match ? [{ ...summary(match), state: demoFollowState(match.public_id) }] : [],
    };
  }
  const results = DEMO_PEOPLE.filter((p) => p.discoverable && p.full_name.toLowerCase().includes(query)).map(
    (p) => ({ ...summary(p), state: demoFollowState(p.public_id) }),
  );
  return { kind: "name", results };
}

/** Every follow action in the demo works and changes nothing. */
export const demoOk = async (..._args: unknown[]) => ({ success: true as const });
