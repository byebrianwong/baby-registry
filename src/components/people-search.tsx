"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/base/input/input";
import { FollowButton } from "@/components/follow-button";
import { searchPeople, type SearchResult } from "@/lib/actions/follows";

const MIN_LENGTH = 3;

export function PeopleSearch({ searchAction = searchPeople }: { searchAction?: typeof searchPeople }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(0);

  const handleChange = (value: string) => {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    if (value.trim().replace(/^@/, "").length < MIN_LENGTH) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    timer.current = setTimeout(async () => {
      const request = ++latest.current;
      const response = await searchAction(value);
      // Ignore answers to older searches that arrive after newer ones.
      if (request !== latest.current) return;
      setError(response.error || "");
      setResults(response.results);
      setSearching(false);
    }, 300);
  };

  return (
    <div className="space-y-3">
      <Input
        label="Find people"
        placeholder="Search by name or username"
        value={query}
        onChange={handleChange}
        hint="Only people who've chosen to show up in search appear here."
      />
      {error && <p className="text-sm text-error-primary">{error}</p>}
      {searching && <p className="text-sm text-tertiary">Searching...</p>}
      {!searching && results !== null && results.length === 0 && (
        <p className="text-sm text-tertiary">No one found. Try their full username, or ask them for their profile link.</p>
      )}
      {!searching && results && results.length > 0 && (
        <ul className="divide-y divide-secondary rounded-xl border border-secondary">
          {results.map((person) => (
            <li key={person.username} className="flex flex-wrap items-center justify-between gap-3 p-3">
              <Link href={`/u/${person.username}`} className="min-w-0 hover:underline">
                <span className="block break-words font-medium text-primary">
                  {person.full_name?.trim() || `@${person.username}`}
                </span>
                <span className="block break-words text-sm text-tertiary">@{person.username}</span>
              </Link>
              {person.state === "self" ? (
                <span className="text-sm font-medium text-tertiary">That&apos;s you</span>
              ) : (
                <FollowButton username={person.username} state={person.state} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
