"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/base/input/input";
import {
  FollowToggle,
  WithdrawRequest,
  useFollow,
  type FollowActions,
  type FollowToggleState,
} from "@/components/follow-button";
import { searchPeople, type SearchResponse, type SearchResult } from "@/lib/actions/follows";
import { sendFollowInvite } from "@/lib/actions/follow-invites";
import { looksLikeEmail } from "@/lib/email-address";
import { initialsFor } from "@/lib/initials";
import { displayName, profilePath } from "@/lib/profile-link";

const MIN_NAME_LENGTH = 3;

type InviteState = { status: "idle" | "sending" | "sent"; error?: string };

// Each result matches the registry cards under the search on the Following
// page: a tinted circle, the name, a line of detail and the action.
const CARD = "rounded-2xl border border-secondary bg-primary p-4 shadow-sm";

function PersonCard({
  person,
  detail,
  error,
  action,
  basePath,
}: {
  person: SearchResult;
  detail: React.ReactNode;
  error?: string;
  action?: React.ReactNode;
  basePath: string;
}) {
  const name = displayName(person);
  return (
    <li className={`flex items-center gap-4 ${CARD}`}>
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-600/10 text-sm font-semibold text-brand-600"
      >
        {initialsFor(name)}
      </span>
      <span className="min-w-0 flex-1">
        <Link href={`${basePath}${profilePath(person)}`} className="block break-words font-medium text-primary hover:underline">
          {name}
        </Link>
        <span className="mt-0.5 block text-sm text-tertiary">{detail}</span>
        {error && <span className="mt-0.5 block text-sm text-error-primary">{error}</span>}
      </span>
      {action && <span className="shrink-0">{action}</span>}
    </li>
  );
}

const DETAIL: Record<FollowToggleState, string> = {
  none: "Approves every follower",
  pending: "Waiting for approval",
  approved: "You can see their private registries",
};

function FollowablePerson({
  person,
  state: initialState,
  basePath,
  followActions,
}: {
  person: SearchResult;
  state: FollowToggleState;
  basePath: string;
  followActions?: FollowActions;
}) {
  const name = displayName(person);
  const { state, busy, error, toggle } = useFollow({
    publicId: person.public_id,
    name,
    state: initialState,
    ...followActions,
  });
  return (
    <PersonCard
      person={person}
      basePath={basePath}
      detail={
        state === "pending" ? (
          <>
            {DETAIL.pending} · <WithdrawRequest name={name} busy={busy} onClick={toggle} />
          </>
        ) : (
          DETAIL[state]
        )
      }
      error={error}
      action={<FollowToggle state={state} busy={busy} onClick={toggle} />}
    />
  );
}

/**
 * Names are searched as you type. Email addresses are looked up only when
 * submitted, and only a whole address matches, so a half-typed one never
 * counts against the hourly lookup limit. When an address finds nobody, the
 * searcher can invite it.
 */
export function PeopleSearch({
  searchAction = searchPeople,
  inviteAction = sendFollowInvite,
  followActions,
  basePath = "",
}: {
  searchAction?: typeof searchPeople;
  inviteAction?: typeof sendFollowInvite;
  /** Stand-ins for the Follow buttons' server actions. The demo passes them. */
  followActions?: FollowActions;
  /** Put in front of profile links. The demo passes "/demo". */
  basePath?: string;
}) {
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<(SearchResponse & { query: string }) | null>(null);
  const [searching, setSearching] = useState(false);
  const [invite, setInvite] = useState<InviteState>({ status: "idle" });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(0);

  const isEmailQuery = query.includes("@");

  const run = async (value: string) => {
    const request = ++latest.current;
    setSearching(true);
    setInvite({ status: "idle" });
    const result = await searchAction(value);
    // Ignore answers to older searches that arrive after newer ones.
    if (request !== latest.current) return;
    setResponse({ ...result, query: value.trim() });
    setSearching(false);
  };

  const handleChange = (value: string) => {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    latest.current++;
    setSearching(false);
    if (value.includes("@") || value.trim().length < MIN_NAME_LENGTH) {
      setResponse(null);
      return;
    }
    timer.current = setTimeout(() => run(value), 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (timer.current) clearTimeout(timer.current);
    if (isEmailQuery ? looksLikeEmail(query) : query.trim().length >= MIN_NAME_LENGTH) {
      run(query);
    }
  };

  const handleInvite = async (email: string) => {
    setInvite({ status: "sending" });
    const result = await inviteAction(email);
    setInvite(result?.error ? { status: "idle", error: result.error } : { status: "sent" });
  };

  let hint = "Search by name, or type someone's whole email address and press Enter.";
  if (isEmailQuery) {
    hint = looksLikeEmail(query)
      ? "Press Enter to look up this email address."
      : "Type the whole email address, then press Enter.";
  }

  const results = response?.results ?? [];
  const showEmpty = !searching && response !== null && !response.error && results.length === 0;

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="space-y-1.5">
        <div className="flex items-end gap-2">
          <div className="min-w-0 flex-1">
            <Input
              label="Find people"
              placeholder="Name or email address"
              value={query}
              onChange={handleChange}
              aria-describedby="people-search-hint"
            />
          </div>
          {isEmailQuery && (
            <Button type="submit" variant="outline" disabled={!looksLikeEmail(query) || searching}>
              Look up
            </Button>
          )}
        </div>
        <p id="people-search-hint" className="text-sm text-tertiary">
          {hint}
        </p>
      </form>

      {response?.error && <p className="text-sm text-error-primary">{response.error}</p>}
      {searching && <p className="text-sm text-tertiary">Searching...</p>}

      {showEmpty && response.kind !== "email" && (
        <p className="text-sm text-tertiary">
          No one found. Try their email address, or ask them for their profile link.
        </p>
      )}

      {showEmpty && response.kind === "email" && (
        <div className={`space-y-3 ${CARD}`}>
          {invite.status === "sent" ? (
            <p className="text-sm text-secondary">
              Invite sent to <strong className="break-words">{response.query}</strong>. If they say yes,
              you&apos;ll follow them.
            </p>
          ) : (
            <>
              <p className="text-sm text-secondary">
                No one has made their account findable with{" "}
                <strong className="break-words">{response.query}</strong>. Invite them, and if they say
                yes, you&apos;ll follow them.
              </p>
              <Button
                size="sm"
                onClick={() => handleInvite(response.query)}
                disabled={invite.status === "sending"}
              >
                {invite.status === "sending" ? "Sending..." : "Send invite"}
              </Button>
              {invite.error && <p className="text-sm text-error-primary">{invite.error}</p>}
            </>
          )}
        </div>
      )}

      {!searching && results.length > 0 && (
        <ul className="flex flex-col gap-3">
          {results.map((person) =>
            person.state === "self" ? (
              <PersonCard key={person.public_id} person={person} detail="That's you" basePath={basePath} />
            ) : (
              <FollowablePerson
                key={person.public_id}
                person={person}
                state={person.state}
                basePath={basePath}
                followActions={followActions}
              />
            ),
          )}
        </ul>
      )}

      <p className="text-xs text-tertiary">
        Only people who&apos;ve chosen to show up in search appear here. Email addresses are never shown.
      </p>
    </div>
  );
}
