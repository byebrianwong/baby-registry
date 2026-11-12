"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/base/input/input";
import { createGroup } from "@/lib/actions/groups";
import { memberCountLabel, type GroupSummary } from "@/lib/groups";

/**
 * The Groups part of the Events tab: saved guest lists, like "The Chens" or
 * "Book club", and a way to start a new one (src/lib/groups.ts).
 */
export function GroupsSection({
  groups,
  createAction = createGroup,
  basePath = "",
}: {
  groups: GroupSummary[];
  /** Makes a group. Stories pass a stand-in. */
  createAction?: (name: string) => Promise<{ error: string | null; id?: string }>;
  /** Put in front of every link. */
  basePath?: string;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const create = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await createAction(name);
    setBusy(false);
    if (result.error || !result.id) {
      setError(result.error ?? "The group wasn't made. Try again.");
      return;
    }
    router.push(`${basePath}/dashboard/groups/${result.id}`);
  };

  return (
    <section aria-labelledby="groups-heading" className="mt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="groups-heading" className="text-xl font-semibold">
            Groups
          </h2>
          <p className="text-sm text-tertiary">
            Guest lists you keep, like your family or book club. Invite a whole group, run its gift exchange each year,
            or share a wishlist with it.
          </p>
        </div>
        {!adding && (
          <Button variant="outline" onClick={() => setAdding(true)}>
            <span className="inline-flex items-center gap-1.5">
              <Plus className="size-4" />
              New group
            </span>
          </Button>
        )}
      </div>

      {adding && (
        <form onSubmit={create} className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end">
          <Input
            label="Group name"
            value={name}
            onChange={setName}
            placeholder="The Chens"
            maxLength={80}
            className="sm:max-w-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <Button type="submit" disabled={busy} className="h-10">
              {busy ? "Making…" : "Make group"}
            </Button>
            <Button type="button" variant="outline" className="h-10" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          </div>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-2 text-sm text-error-primary">
          {error}
        </p>
      )}

      {groups.length > 0 ? (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <li key={group.id}>
              <Link
                href={`${basePath}/dashboard/groups/${group.id}`}
                className="flex items-center gap-3 rounded-xl border border-secondary p-4 hover:border-primary"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-50">
                  <Users aria-hidden="true" className="size-4.5 text-brand-600" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-primary">{group.name}</span>
                  <span className="block text-sm text-tertiary">{memberCountLabel(group.memberCount)}</span>
                </span>
                <ChevronRight aria-hidden="true" className="size-4 text-tertiary" />
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        !adding && (
          <p className="mt-4 text-sm text-tertiary">
            No groups yet. Make one here, or save an event&apos;s guest list as a group from the event&apos;s page.
          </p>
        )
      )}
    </section>
  );
}
