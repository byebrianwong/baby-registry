"use client";

import { useState } from "react";
import { ExternalLink, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SuggestionActions } from "./suggestion-actions";
import { formatPrice } from "@/lib/money";

type SuggestionStatus = "pending" | "offering" | "added" | "accepted" | "declined";
type FilterMode = "all" | SuggestionStatus;

interface Suggestion {
  id: string;
  title: string;
  external_url: string | null;
  price: number | null;
  notes: string | null;
  suggested_by_name: string;
  suggested_by_email: string | null;
  status: SuggestionStatus;
  created_at: string;
}

const FILTERS: { value: FilterMode; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "offering", label: "Offering" },
  { value: "added", label: "Added" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
];

const TAG_STYLES: Record<SuggestionStatus, string> = {
  pending: "border-gray-500 text-primary",
  offering: "border-mint-200 text-primary",
  added: "bg-brand-600 border-brand-600 text-white",
  accepted: "bg-mint-200 border-mint-200 text-primary",
  declined: "bg-blush-200 border-blush-200 text-primary",
};

const TAG_LABELS: Record<SuggestionStatus, string> = {
  pending: "Pending",
  offering: "Offering to gift",
  added: "Added",
  accepted: "Accepted",
  declined: "Declined",
};

export function SuggestionInbox({
  suggestions,
  registryId,
}: {
  suggestions: Suggestion[];
  registryId: string;
}) {
  const [filter, setFilter] = useState<FilterMode>("all");

  const filtered =
    filter === "all"
      ? suggestions
      : suggestions.filter((s) => s.status === filter);

  const counts: Record<FilterMode, number> = {
    all: suggestions.length,
    pending: suggestions.filter((s) => s.status === "pending").length,
    offering: suggestions.filter((s) => s.status === "offering").length,
    added: suggestions.filter((s) => s.status === "added").length,
    accepted: suggestions.filter((s) => s.status === "accepted").length,
    declined: suggestions.filter((s) => s.status === "declined").length,
  };

  return (
    <>
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Suggestion Inbox</h2>
        <p className="text-sm text-tertiary">
          Items suggested by your guests
        </p>
      </div>

      {suggestions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Lightbulb className="h-8 w-8 text-tertiary mb-2" />
            <p className="text-tertiary">
              No suggestions yet. Guests can suggest items from your registry page.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex gap-8 items-start">
          <nav className="hidden md:flex flex-col gap-1 w-40 shrink-0 sticky top-20">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors ${
                  filter === f.value
                    ? "bg-active font-medium text-secondary"
                    : "text-tertiary hover:text-secondary hover:bg-active"
                }`}
              >
                <span>{f.label}</span>
                <span className="text-xs text-tertiary">{counts[f.value]}</span>
              </button>
            ))}
          </nav>

          <div className="flex-1 min-w-0 space-y-3">
            {filtered.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <p className="text-tertiary">
                    No {filter} suggestions.
                  </p>
                </CardContent>
              </Card>
            ) : (
              filtered.map((suggestion) => (
                <Card key={suggestion.id} className="py-0">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className="flex-1 min-w-0 text-base font-semibold text-secondary">
                          {suggestion.title}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium shrink-0 ${TAG_STYLES[suggestion.status]}`}
                        >
                          {TAG_LABELS[suggestion.status]}
                        </span>
                        <span className="text-xs text-secondary shrink-0">
                          {new Date(suggestion.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      {suggestion.price && (
                        <p className="text-sm font-semibold text-secondary">
                          {formatPrice(suggestion.price)}
                        </p>
                      )}
                      <div className="flex items-center gap-2.5 text-xs text-secondary">
                        <span>Suggested by {suggestion.suggested_by_name}</span>
                        {suggestion.suggested_by_email && (
                          <span>{suggestion.suggested_by_email}</span>
                        )}
                      </div>
                      {suggestion.notes && (
                        <p className="text-xs text-secondary whitespace-pre-line">
                          &ldquo;{suggestion.notes}&rdquo;
                        </p>
                      )}
                      <div className="flex items-center justify-between pt-2">
                        {suggestion.external_url ? (
                          <Button variant="outline" size="sm" asChild>
                            <a
                              href={suggestion.external_url}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <span className="inline-flex items-center gap-1.5">
                                <ExternalLink className="h-4 w-4 shrink-0" />
                                Shop
                              </span>
                            </a>
                          </Button>
                        ) : (
                          <div />
                        )}
                        {(suggestion.status === "pending" || suggestion.status === "offering") && (
                          <SuggestionActions
                            suggestionId={suggestion.id}
                            registryId={registryId}
                            status={suggestion.status}
                          />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
