"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/base/input/input";
import { FollowButton } from "@/components/follow-button";
import { searchPeople, type SearchResponse } from "@/lib/actions/follows";
import { sendFollowInvite } from "@/lib/actions/follow-invites";
import { looksLikeEmail } from "@/lib/email-address";
import { displayName, profilePath } from "@/lib/profile-link";

const MIN_NAME_LENGTH = 3;
const RETURN_TO = "/dashboard/following";

type InviteState = { status: "idle" | "sending" | "sent"; error?: string };

/**
 * Names are searched as you type. Email addresses are looked up only when
 * submitted, and only a whole address matches, so a half-typed one never
 * counts against the hourly lookup limit. When an address finds nobody, the
 * searcher can invite it.
 */
export function PeopleSearch({
  searchAction = searchPeople,
  inviteAction = sendFollowInvite,
}: {
  searchAction?: typeof searchPeople;
  inviteAction?: typeof sendFollowInvite;
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
        <div className="space-y-3 rounded-xl border border-secondary p-4">
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
        <ul className="divide-y divide-secondary rounded-xl border border-secondary">
          {results.map((person) => (
            <li key={person.public_id} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <Link
                href={profilePath(person)}
                className="min-w-0 break-words font-medium text-primary hover:underline"
              >
                {displayName(person)}
              </Link>
              {person.state === "self" ? (
                <span className="text-sm font-medium text-tertiary">That&apos;s you</span>
              ) : (
                <FollowButton
                  publicId={person.public_id}
                  name={displayName(person)}
                  state={person.state}
                  returnTo={RETURN_TO}
                />
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-tertiary">
        Only people who&apos;ve chosen to show up in search appear here. Email addresses are never shown.
      </p>
    </div>
  );
}
