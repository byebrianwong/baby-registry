"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarHeart, Gift, Loader2, Pencil, Trash2, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";
import {
  addGroupMembers,
  deleteGroup,
  removeGroupMember,
  renameGroup,
} from "@/lib/actions/groups";
import { startGroupExchange } from "@/lib/actions/events";
import { formatShortEventDate, isEmail, parseGuestList } from "@/lib/events";
import { memberCountLabel, type GroupEvent, type GroupMember, type Person } from "@/lib/groups";
import { initialsFor } from "@/lib/initials";

type ActionResult = { error: string | null };

export interface GroupManagerActions {
  rename: (groupId: string, name: string) => Promise<ActionResult>;
  remove: (groupId: string) => Promise<ActionResult>;
  addMembers: (groupId: string, people: Person[]) => Promise<ActionResult & { added?: number; alreadyListed?: number }>;
  removeMember: (groupId: string, memberId: string) => Promise<ActionResult>;
  startExchange: (groupId: string) => Promise<ActionResult & { id?: string }>;
}

const DEFAULT_ACTIONS: GroupManagerActions = {
  rename: renameGroup,
  remove: deleteGroup,
  addMembers: addGroupMembers,
  removeMember: removeGroupMember,
  startExchange: startGroupExchange,
};

export interface GroupManagerProps {
  group: { id: string; name: string };
  members: Pick<GroupMember, "id" | "name" | "email">[];
  events: GroupEvent[];
  /** The owner's lists shared with this group. */
  sharedLists: { id: string; slug: string; title: string }[];
  /** Stories pass stand-ins. */
  actions?: Partial<GroupManagerActions>;
}

/**
 * A group's page: its people, its gift exchanges and events, and the lists
 * shared with it (src/lib/groups.ts). Only the group's owner sees it.
 */
export function GroupManager({ group, members, events, sharedLists, actions: overrides }: GroupManagerProps) {
  const router = useRouter();
  const actions = { ...DEFAULT_ACTIONS, ...overrides };
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(group.name);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [pasting, setPasting] = useState(false);
  const [pasted, setPasted] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const pastePreview = useMemo(() => parseGuestList(pasted), [pasted]);
  const exchanges = events.filter((e) => e.hasExchange);
  const lastExchange = exchanges[0];

  const run = async <T extends ActionResult>(key: string, action: () => Promise<T>): Promise<T | null> => {
    setBusy(key);
    setError("");
    const result = await action();
    setBusy(null);
    if (result.error) {
      setError(result.error);
      return null;
    }
    return result;
  };

  const saveName = async (event: React.FormEvent) => {
    event.preventDefault();
    if (await run("rename", () => actions.rename(group.id, name))) {
      setRenaming(false);
      router.refresh();
    }
  };

  const add = async (people: Person[]) => {
    const result = await run("add", () => actions.addMembers(group.id, people));
    if (!result) return false;
    const added = result.added ?? people.length;
    const skipped = result.alreadyListed ?? 0;
    toast.success(
      `${added === 1 ? "Added 1 person" : `Added ${added} people`}${skipped ? `. ${skipped} already in the group.` : ""}`,
    );
    router.refresh();
    return true;
  };

  const addOne = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newName.trim()) {
      setError("Add the person's name.");
      return;
    }
    if (newEmail.trim() && !isEmail(newEmail.trim())) {
      setError("That email address doesn't look right.");
      return;
    }
    if (await add([{ name: newName.trim(), email: newEmail.trim() || null }])) {
      setNewName("");
      setNewEmail("");
    }
  };

  const addPasted = async () => {
    if (pastePreview.guests.length === 0) {
      setError("Paste one person per line, like: Glinda Upland, glinda@example.com");
      return;
    }
    if (await add(pastePreview.guests)) {
      setPasted("");
      setPasting(false);
    }
  };

  const startExchange = async () => {
    const result = await run("exchange", () => actions.startExchange(group.id));
    if (result?.id) router.push(`/dashboard/events/${result.id}`);
  };

  const removeGroup = async () => {
    if (await run("delete", () => actions.remove(group.id))) {
      toast.success(`Deleted “${group.name}”`);
      router.push("/dashboard/events");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        {renaming ? (
          <form onSubmit={saveName} className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <Input label="Group name" value={name} onChange={setName} maxLength={80} className="sm:max-w-sm" autoFocus />
            <div className="flex gap-2">
              <Button type="submit" disabled={busy !== null} className="h-10">
                {busy === "rename" ? "Saving…" : "Save"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10"
                onClick={() => {
                  setRenaming(false);
                  setName(group.name);
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold">{group.name}</h1>
            <Button variant="ghost" size="sm" onClick={() => setRenaming(true)} aria-label="Rename the group">
              <Pencil className="size-4" />
            </Button>
          </div>
        )}
        <p className="mt-1 text-tertiary">
          {memberCountLabel(members.length)}. Invite the whole group from an event&apos;s guest list, run a gift exchange
          with it, or share a wishlist with it.
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-xl bg-error-secondary p-3 text-sm text-error-primary">
          {error}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <CardTitle>People</CardTitle>
            <CardDescription>
              Anyone here with a Regibee account under this email sees the lists you share with the group.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {pasting ? (
              <div className="flex flex-col gap-3">
                <TextArea
                  aria-label="People to add"
                  value={pasted}
                  onChange={setPasted}
                  rows={5}
                  autoCorrect="off"
                  spellCheck="false"
                  placeholder={"Glinda Upland, glinda@example.com\nElphaba Thropp <elphie@example.com>\nNessa Thropp"}
                  hint="One person per line: a name and an email address."
                />
                {pasted.trim() && (
                  <p className="text-sm text-tertiary">
                    {pastePreview.guests.length === 1 ? "1 person" : `${pastePreview.guests.length} people`} ready to add
                    {pastePreview.skipped.length > 0 &&
                      `. ${pastePreview.skipped.length === 1 ? "1 line" : `${pastePreview.skipped.length} lines`} couldn't be read`}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  <Button onClick={addPasted} disabled={busy !== null}>
                    <span className="inline-flex items-center gap-1.5">
                      {busy === "add" ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                      Add people
                    </span>
                  </Button>
                  <Button variant="outline" onClick={() => setPasting(false)}>
                    Add one at a time
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={addOne} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <Input label="Name" value={newName} onChange={setNewName} autoComplete="off" className="sm:flex-1" maxLength={100} />
                <Input
                  label="Email (optional)"
                  type="email"
                  value={newEmail}
                  onChange={setNewEmail}
                  autoComplete="off"
                  className="sm:flex-1"
                />
                <Button type="submit" disabled={busy !== null} className="h-10">
                  <span className="inline-flex items-center gap-1.5">
                    {busy === "add" ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
                    Add
                  </span>
                </Button>
              </form>
            )}
            {!pasting && (
              <button
                type="button"
                onClick={() => setPasting(true)}
                className="self-start text-sm font-medium text-brand-600 hover:underline max-sm:min-h-11"
              >
                Paste a list
              </button>
            )}

            {members.length === 0 ? (
              <p className="text-sm text-tertiary">Nobody in this group yet.</p>
            ) : (
              <ul className="divide-y divide-secondary rounded-xl border border-secondary">
                {members.map((member) => (
                  <li key={member.id} className="flex items-center gap-3 px-3 py-2">
                    <span
                      aria-hidden="true"
                      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-xs font-semibold text-brand-700"
                    >
                      {initialsFor(member.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-primary">{member.name}</span>
                      <span className="block truncate text-xs text-tertiary">{member.email ?? "No email"}</span>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove ${member.name}`}
                      disabled={busy !== null}
                      onClick={async () => {
                        if (await run(`remove-${member.id}`, () => actions.removeMember(group.id, member.id))) {
                          router.refresh();
                        }
                      }}
                    >
                      <X className="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <aside className="flex flex-col gap-4">
          <Card className="py-0">
            <CardContent className="flex flex-col gap-3 p-4">
              <div className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-mint-100">
                  <Gift aria-hidden="true" className="size-4.5 text-mint-800" />
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-primary">Gift exchange</p>
                  <p className="text-sm text-tertiary">
                    {lastExchange
                      ? "Starts a new exchange with everyone in the group. It keeps last time's budget and pairs who shouldn't draw each other, and nobody draws the same person as last time."
                      : "Makes an event with everyone in the group as guests and a Secret Santa draw. Set the date and budget next."}
                  </p>
                  {lastExchange && (
                    <p className="mt-1 text-sm">
                      Last time:{" "}
                      <Link href={`/dashboard/events/${lastExchange.id}`} className="font-medium text-brand-600 hover:underline">
                        {lastExchange.title}
                      </Link>
                      {lastExchange.event_date && (
                        <span className="text-tertiary"> · {formatShortEventDate(lastExchange.event_date)}</span>
                      )}
                    </p>
                  )}
                </div>
              </div>
              <Button onClick={startExchange} disabled={busy !== null || members.length === 0}>
                {busy === "exchange" ? "Starting…" : lastExchange ? "Start this year's exchange" : "Start a gift exchange"}
              </Button>
            </CardContent>
          </Card>

          {events.length > 0 && (
            <Card className="py-0">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blush-50">
                    <CalendarHeart aria-hidden="true" className="size-4.5 text-blush-700" />
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-primary">Events with this group</p>
                    <ul className="text-sm">
                      {events.map((event) => (
                        <li key={event.id}>
                          <Link href={`/dashboard/events/${event.id}`} className="text-brand-600 hover:underline">
                            {event.title}
                          </Link>
                          {event.event_date && (
                            <span className="text-tertiary"> · {formatShortEventDate(event.event_date)}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="py-0">
            <CardContent className="p-4">
              <p className="font-medium text-primary">Lists shared with this group</p>
              {sharedLists.length > 0 ? (
                <ul className="text-sm">
                  {sharedLists.map((list) => (
                    <li key={list.id}>
                      <Link href={`/dashboard/registry/${list.id}`} className="text-brand-600 hover:underline">
                        {list.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-tertiary">
                  None yet. Share a wishlist from its Settings page, and people here see it on their Following page.
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="border-error-primary/50 py-0">
            <CardContent className="flex flex-col gap-2 p-4">
              {confirmDelete ? (
                <>
                  <p className="text-sm text-secondary">
                    Delete &ldquo;{group.name}&rdquo;? Events keep their guests. Shared lists stop being shared with these
                    people.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="destructive" size="sm" onClick={removeGroup} disabled={busy !== null}>
                      {busy === "delete" ? "Deleting…" : "Delete group"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
                      Keep it
                    </Button>
                  </div>
                </>
              ) : (
                <Button variant="ghost" size="sm" className="self-start" onClick={() => setConfirmDelete(true)}>
                  <span className="inline-flex items-center gap-1.5 text-error-primary">
                    <Trash2 className="size-4" />
                    Delete group
                  </span>
                </Button>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
