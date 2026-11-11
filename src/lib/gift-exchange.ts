// Drawing names for a gift exchange. Nothing here talks to the database, so
// it can be tested on its own (src/lib/gift-exchange.test.ts). The server
// action that saves a draw is drawExchangeNames in src/lib/actions/events.ts.

/** Two people who shouldn't draw each other, either way round. */
export type Pair = readonly [string, string];

export interface DrawInput {
  /** Everyone in the exchange, by id. */
  people: string[];
  /** Pairs who must not draw each other, such as partners. */
  exclusions: Pair[];
  /**
   * Who gave to whom last time, as [giver, receiver]. The draw avoids these
   * when it can, and repeats one only when there's no other way.
   */
  previous?: Pair[];
  /** For tests: a source of random numbers in [0, 1). */
  random?: () => number;
}

export type DrawResult =
  | { ok: true; matches: Map<string, string> }
  | { ok: false; reason: "too_few" | "impossible" };

function key(a: string, b: string): string {
  return `${a}\u0000${b}`;
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Most attempts a search makes before giving up on one set of rules. Enough
// for hundreds of people with a few exclusions each, and it keeps a set of
// rules that can't be met from running forever.
const STEP_LIMIT = 200_000;

/**
 * Finds a giver for every receiver with a depth-first search in random
 * order. Returns null when the rules can't be met or the search runs out of
 * steps.
 */
function search(
  people: string[],
  allowed: (giver: string, receiver: string) => boolean,
  avoidMutual: boolean,
  random: () => number,
): Map<string, string> | null {
  // People with the fewest choices go first, so dead ends show up early.
  const givers = shuffle(people, random).sort(
    (a, b) => people.filter((r) => allowed(a, r)).length - people.filter((r) => allowed(b, r)).length,
  );
  const taken = new Set<string>();
  const matches = new Map<string, string>();
  let steps = 0;

  const place = (index: number): boolean => {
    if (index === givers.length) return true;
    if (++steps > STEP_LIMIT) return false;
    const giver = givers[index];
    for (const receiver of shuffle(people, random)) {
      if (taken.has(receiver) || !allowed(giver, receiver)) continue;
      // With more than two people, nobody draws the person who drew them.
      if (avoidMutual && matches.get(receiver) === giver) continue;
      taken.add(receiver);
      matches.set(giver, receiver);
      if (place(index + 1)) return true;
      taken.delete(receiver);
      matches.delete(giver);
      if (steps > STEP_LIMIT) return false;
    }
    return false;
  };

  return place(0) ? matches : null;
}

/**
 * Draws names: each person gives to exactly one other person, and each
 * person receives from exactly one. Nobody draws themselves or someone
 * they're excluded from. It also tries, in this order of importance, to
 * avoid last time's pairs and two people drawing each other. When those
 * can't all be met, it drops them one at a time, but never an exclusion.
 */
export function drawNames({ people, exclusions, previous = [], random = Math.random }: DrawInput): DrawResult {
  const unique = [...new Set(people)];
  if (unique.length < 3) return { ok: false, reason: "too_few" };

  const excluded = new Set<string>();
  for (const [a, b] of exclusions) {
    excluded.add(key(a, b));
    excluded.add(key(b, a));
  }
  const repeated = new Set(previous.map(([giver, receiver]) => key(giver, receiver)));

  const hardRule = (giver: string, receiver: string) => giver !== receiver && !excluded.has(key(giver, receiver));
  const withHistory = (giver: string, receiver: string) =>
    hardRule(giver, receiver) && !repeated.has(key(giver, receiver));

  const attempts: [(g: string, r: string) => boolean, boolean][] = [
    [withHistory, true],
    [withHistory, false],
    [hardRule, true],
    [hardRule, false],
  ];
  for (const [allowed, avoidMutual] of attempts) {
    const matches = search(unique, allowed, avoidMutual, random);
    if (matches) return { ok: true, matches };
  }
  return { ok: false, reason: "impossible" };
}

/** An exclusion pair in the order the database stores it: smaller id first. */
export function orderedPair(a: string, b: string): Pair {
  return a < b ? [a, b] : [b, a];
}
