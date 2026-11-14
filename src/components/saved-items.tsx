"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useMemo, useState, useTransition } from "react";
import { EyeOff, Gift, ListPlus, Plus } from "lucide-react";
import { SearchLg } from "@untitledui/icons";
import {
  Dialog as AriaDialog,
  DialogTrigger as AriaDialogTrigger,
  Heading as AriaHeading,
  Popover as AriaPopover,
  ToggleButton as AriaToggleButton,
  ToggleButtonGroup as AriaToggleButtonGroup,
  type PopoverProps as AriaPopoverProps,
} from "react-aria-components";
import { AddItemDialog } from "@/components/add-item-dialog";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Input } from "@/components/base/input/input";
import { ItemImage } from "@/components/item-image";
import { PandaMark } from "@/components/panda-mark";
import { Button } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { addItemsToList, removeItemsFromList, startMyWishlist } from "@/lib/actions/saved";
import { formatPrice } from "@/lib/money";
import type { SavedItem, SavedList } from "@/lib/saved-items";
import { cx } from "@/lib/utils/cx";

// The Saved tab: every item on every list you own, once each, with the lists
// it's on. An item can be on several of your lists at once, and a gift
// reserved through any of them counts on all of them. Changes show straight
// away, then the page refreshes from the server.

export interface SavedItemsProps {
  lists: SavedList[];
  items: SavedItem[];
  // Stories pass stand-ins. The page uses the real server actions.
  addAction?: typeof addItemsToList;
  removeAction?: typeof removeItemsFromList;
  startWishlistAction?: typeof startMyWishlist;
  /**
   * Rendered in place of the "Save an item" dialog, which needs the server.
   * Gets the lists and the one it starts on.
   */
  renderSaveItem?: (lists: SavedList[], defaultListId: string) => React.ReactNode;
}

type StatusFilter = "wanted" | "gifted" | "all";

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "wanted", label: "Still wanted" },
  { id: "gifted", label: "Gifted" },
  { id: "all", label: "All" },
];

function countLabel(n: number, one = "item", many = "items") {
  return `${n} ${n === 1 ? one : many}`;
}

/** "Wishlist", "Birthday", or "Wishlist for Max" for a list kept for a child. */
function listKind(list: SavedList) {
  return list.forChild ? `${list.kindLabel} for ${list.forChild}` : list.kindLabel;
}

/** Only web links open from the card. */
function webUrl(url: string | null) {
  return url && /^https?:\/\//i.test(url) ? url : null;
}

function storeDomain(url: string | null) {
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function matchesStatus(item: SavedItem, filter: StatusFilter) {
  if (filter === "all") return true;
  if (filter === "wanted") return item.status === "wanted";
  return item.status !== "wanted";
}

function errorOf(result: unknown): string | null {
  if (result && typeof result === "object" && "error" in result) {
    const error = (result as { error?: unknown }).error;
    if (typeof error === "string" && error) return error;
  }
  return null;
}

/** A popover panel for choosing lists. Keyboard users get focus inside it. */
function PopoverPanel({ className, ...props }: Omit<AriaPopoverProps, "className"> & { className?: string }) {
  return (
    <AriaPopover
      offset={6}
      containerPadding={16}
      {...props}
      className={(state) =>
        cx(
          "w-72 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl bg-primary p-3 shadow-lg ring-1 ring-secondary_alt outline-hidden",
          state.isEntering &&
            "duration-150 ease-out animate-in fade-in placement-top:slide-in-from-bottom-0.5 placement-bottom:slide-in-from-top-0.5",
          state.isExiting && "duration-100 ease-in animate-out fade-out",
          className,
        )
      }
    />
  );
}

function EmptyState({ hasLists }: { hasLists: boolean }) {
  return (
    <div className="mt-6 flex flex-col items-center rounded-2xl border border-secondary px-4 py-12 text-center">
      <PandaMark className="h-16 w-auto" />
      <h2 className="mt-3 font-semibold text-primary">Nothing saved yet</h2>
      <p className="mt-1 max-w-sm text-sm text-tertiary">
        {hasLists
          ? "Found something you'd love? Paste its link into Save an item, or save it with the Regibee extension while you shop."
          : "Start your wishlist, then save things to it as you find them."}
      </p>
    </div>
  );
}

function StartWishlistCallout({ action, hasLists }: { action: typeof startMyWishlist; hasLists: boolean }) {
  const router = useRouter();
  const headingId = useId();
  const [busy, setBusy] = useState(false);
  const [refreshing, startRefresh] = useTransition();
  const [error, setError] = useState("");

  const start = async () => {
    setBusy(true);
    setError("");
    let message: string | null;
    try {
      message = errorOf(await action());
    } catch {
      message = "Your wishlist wasn't made. Try again in a moment.";
    }
    setBusy(false);
    if (message) {
      setError(message);
      return;
    }
    startRefresh(() => router.refresh());
  };

  const working = busy || refreshing;

  return (
    <section
      aria-labelledby={headingId}
      className="mt-6 flex flex-col gap-4 rounded-2xl bg-brand-50 p-4 sm:flex-row sm:items-center sm:p-5"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary">
        <Gift aria-hidden="true" className="size-5 text-brand-600" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id={headingId} className="font-semibold text-primary">
          Start your wishlist
        </h2>
        <p className="mt-1 text-sm text-secondary">
          One list for birthdays, Christmas and any other day.{" "}
          {hasLists
            ? "Save things to it as you find them, and put them on your other lists too."
            : "Save things to it as you find them, and family and friends always know what you'd love."}
        </p>
        {error && (
          <p role="alert" className="mt-2 text-sm text-error-primary">
            {error}
          </p>
        )}
      </div>
      <Button onClick={start} disabled={working} className="self-start sm:self-center">
        {working ? "Starting…" : "Start my wishlist"}
      </Button>
    </section>
  );
}

/** The "Lists" button on an item: tick the lists it should be on. */
function ItemListsPicker({
  item,
  lists,
  pending,
  onToggle,
}: {
  item: SavedItem;
  lists: SavedList[];
  pending: boolean;
  onToggle: (listId: string, on: boolean) => Promise<string | null>;
}) {
  const [isOpen, setOpen] = useState(false);
  const [confirmListId, setConfirmListId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const change = async (listId: string, on: boolean) => {
    setError("");
    // Taking it off the only list it's on deletes it, so ask first.
    if (!on && item.listIds.length === 1 && item.listIds[0] === listId) {
      setConfirmListId(listId);
      return;
    }
    setConfirmListId(null);
    const message = await onToggle(listId, on);
    if (message) setError(message);
  };

  const confirmDelete = async () => {
    if (!confirmListId) return;
    const listId = confirmListId;
    setConfirmListId(null);
    setOpen(false);
    await onToggle(listId, false);
  };

  return (
    <AriaDialogTrigger
      isOpen={isOpen}
      onOpenChange={(open) => {
        setOpen(open);
        if (!open) {
          setConfirmListId(null);
          setError("");
        }
      }}
    >
      <Button variant="outline" size="sm" aria-label={`Lists for ${item.title}`} className="shrink-0">
        <span className="inline-flex items-center gap-1.5 align-top">
          <ListPlus aria-hidden="true" className="size-4 shrink-0" />
          Lists
        </span>
      </Button>
      <PopoverPanel placement="bottom end">
        <AriaDialog className="outline-hidden">
          <AriaHeading slot="title" className="text-sm font-semibold text-primary">
            On your lists
          </AriaHeading>
          <p className="mt-0.5 truncate text-sm text-tertiary">{item.title}</p>
          <div className="mt-3 flex flex-col gap-3">
            {lists.map((list) => (
              <Checkbox
                key={list.id}
                label={list.title}
                hint={listKind(list)}
                isSelected={item.listIds.includes(list.id)}
                isReadOnly={pending}
                onChange={(on) => change(list.id, on)}
              />
            ))}
          </div>
          {pending && (
            <p role="status" className="mt-3 text-sm text-tertiary">
              Saving…
            </p>
          )}
          {confirmListId && (
            <div className="mt-3 rounded-lg bg-error-primary p-3">
              <p role="alert" className="text-sm text-primary">
                It&apos;s on no other list, so taking it off deletes it.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button variant="destructive" size="sm" onClick={confirmDelete}>
                  Delete it
                </Button>
                <Button variant="outline" size="sm" onClick={() => setConfirmListId(null)}>
                  Keep it
                </Button>
              </div>
            </div>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-error-primary">
              {error}
            </p>
          )}
        </AriaDialog>
      </PopoverPanel>
    </AriaDialogTrigger>
  );
}

function SavedItemCard({
  item,
  lists,
  listsById,
  selected,
  pending,
  onSelect,
  onToggleList,
}: {
  item: SavedItem;
  lists: SavedList[];
  listsById: Map<string, SavedList>;
  selected: boolean;
  pending: boolean;
  onSelect: (selected: boolean) => void;
  onToggleList: (listId: string, on: boolean) => Promise<string | null>;
}) {
  const href = webUrl(item.externalUrl);
  const meta = [item.price != null ? formatPrice(item.price) : null, storeDomain(href)].filter(Boolean).join(" · ");
  const onLists = item.listIds.map((id) => listsById.get(id)).filter((list): list is SavedList => Boolean(list));

  return (
    <li
      className={cx(
        "flex flex-col rounded-xl border bg-primary p-3 shadow-xs transition-colors",
        selected ? "border-brand-600 ring-1 ring-brand-600" : "border-secondary",
      )}
    >
      <div className="flex gap-3">
        <Checkbox
          aria-label={`Select ${item.title}`}
          isSelected={selected}
          onChange={onSelect}
          className="-m-1 self-start p-1"
        />
        <ItemImage imageUrl={item.imageUrl} title={item.title} />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-sm font-semibold break-words text-primary">
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-sm outline-focus-ring hover:underline focus-visible:outline-2"
              >
                {item.title}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : (
              item.title
            )}
          </h3>
          {meta && <p className="mt-0.5 truncate text-sm text-tertiary">{meta}</p>}
          {item.status === "gifted" && (
            <Tag variant="gifted" className="mt-1.5">
              Gifted
            </Tag>
          )}
          {item.status === "have" && (
            <Tag variant="purchased-by-you" className="mt-1.5">
              You have it
            </Tag>
          )}
        </div>
      </div>
      <div className="mt-auto flex items-end justify-between gap-2 pt-3">
        <ul aria-label="On these lists" className="flex min-w-0 flex-wrap gap-1">
          {onLists.map((list) => (
            <li key={list.id} className="min-w-0">
              <Link
                href={`/dashboard/registry/${list.id}`}
                title={list.title}
                className="block max-w-40 truncate rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary outline-focus-ring hover:bg-tertiary focus-visible:outline-2"
              >
                {list.title}
              </Link>
            </li>
          ))}
        </ul>
        <ItemListsPicker item={item} lists={lists} pending={pending} onToggle={onToggleList} />
      </div>
    </li>
  );
}

/** A list to pick in the bulk bar's popovers. */
function ListOption({
  list,
  hint,
  disabled,
  onPick,
}: {
  list: SavedList;
  hint: string;
  disabled?: boolean;
  onPick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        onClick={onPick}
        className="w-full cursor-pointer rounded-lg px-2.5 py-2 text-left outline-focus-ring transition-colors hover:bg-primary_hover focus-visible:outline-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-transparent"
      >
        <span className="block truncate text-sm font-medium text-primary">{list.title}</span>
        <span className="block truncate text-xs text-tertiary">{hint}</span>
      </button>
    </li>
  );
}

function BulkBar({
  selected,
  lists,
  onAdd,
  onRemove,
  onClear,
}: {
  selected: SavedItem[];
  lists: SavedList[];
  onAdd: (list: SavedList) => Promise<string | null>;
  onRemove: (list: SavedList) => Promise<string | null>;
  onClear: () => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [confirmList, setConfirmList] = useState<SavedList | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const n = selected.length;
  const removable = lists.filter((list) => selected.some((item) => item.listIds.includes(list.id)));
  const onlyOn = (list: SavedList) => selected.filter((item) => item.listIds.length === 1 && item.listIds[0] === list.id);

  const run = async (task: () => Promise<string | null>) => {
    setBusy(true);
    setError("");
    setAddOpen(false);
    setRemoveOpen(false);
    setConfirmList(null);
    const message = await task();
    setBusy(false);
    if (message) setError(message);
  };

  const pickRemove = (list: SavedList) => {
    if (onlyOn(list).length > 0) setConfirmList(list);
    else run(() => onRemove(list));
  };

  const deleting = confirmList ? onlyOn(confirmList) : [];

  return (
    <section aria-label="Selected items" className="sticky bottom-4 z-30 mt-6">
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-secondary bg-primary p-2.5 shadow-lg sm:gap-3 sm:p-3 sm:px-4">
        <p className="mr-auto text-sm font-semibold text-primary">{n} selected</p>
        <Button variant="ghost" size="sm" onClick={onClear} className="sm:order-last">
          Clear<span className="sr-only"> selection</span>
        </Button>
        <div className="flex w-full gap-2 sm:w-auto">
          <AriaDialogTrigger isOpen={addOpen} onOpenChange={setAddOpen}>
            <Button variant="outline" size="sm" disabled={busy} className="flex-1 px-2.5 sm:flex-none sm:px-3.5">
              Add to list…
            </Button>
            <PopoverPanel placement="top">
              <AriaDialog className="outline-hidden">
                <AriaHeading slot="title" className="px-2.5 text-sm font-semibold text-primary">
                  Add {countLabel(n)} to
                </AriaHeading>
                <ul className="mt-2 flex flex-col gap-0.5">
                  {lists.map((list) => {
                    const already = selected.every((item) => item.listIds.includes(list.id));
                    return (
                      <ListOption
                        key={list.id}
                        list={list}
                        hint={already ? (n === 1 ? "It's on this list" : "They're all on this list") : listKind(list)}
                        disabled={already}
                        onPick={() => run(() => onAdd(list))}
                      />
                    );
                  })}
                </ul>
              </AriaDialog>
            </PopoverPanel>
          </AriaDialogTrigger>

          <AriaDialogTrigger
            isOpen={removeOpen}
            onOpenChange={(open) => {
              setRemoveOpen(open);
              if (!open) setConfirmList(null);
            }}
          >
            <Button variant="outline" size="sm" disabled={busy} className="flex-1 px-2.5 sm:flex-none sm:px-3.5">
              Remove from list…
            </Button>
            <PopoverPanel placement="top">
              <AriaDialog className="outline-hidden">
                {confirmList ? (
                  <>
                    <AriaHeading slot="title" className="text-sm font-semibold text-primary">
                      {deleting.length === 1 ? "Delete an item?" : `Delete ${deleting.length} items?`}
                    </AriaHeading>
                    <p role="alert" className="mt-1 text-sm text-tertiary">
                      {deleting.length === 1
                        ? `“${deleting[0].title}” is only on ${confirmList.title}, so taking it off deletes it.`
                        : `${deleting.length} of these are only on ${confirmList.title}, so taking them off deletes them.`}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button variant="destructive" size="sm" onClick={() => run(() => onRemove(confirmList))}>
                        Remove and delete
                      </Button>
                      <Button variant="outline" size="sm" autoFocus onClick={() => setConfirmList(null)}>
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <AriaHeading slot="title" className="px-2.5 text-sm font-semibold text-primary">
                      Remove {countLabel(n)} from
                    </AriaHeading>
                    <ul className="mt-2 flex flex-col gap-0.5">
                      {removable.map((list) => {
                        const onIt = selected.filter((item) => item.listIds.includes(list.id)).length;
                        return (
                          <ListOption
                            key={list.id}
                            list={list}
                            hint={
                              onIt === n
                                ? n === 1
                                  ? "It's on this list"
                                  : "All of them are on it"
                                : `${onIt} of them ${onIt === 1 ? "is" : "are"} on it`
                            }
                            onPick={() => pickRemove(list)}
                          />
                        );
                      })}
                    </ul>
                  </>
                )}
              </AriaDialog>
            </PopoverPanel>
          </AriaDialogTrigger>
        </div>
        {busy && (
          <p role="status" className="w-full text-sm text-tertiary sm:order-last">
            Saving…
          </p>
        )}
        {error && (
          <p role="alert" className="w-full text-sm text-error-primary sm:order-last">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}

export function SavedItems({
  lists,
  items,
  addAction = addItemsToList,
  removeAction = removeItemsFromList,
  startWishlistAction = startMyWishlist,
  renderSaveItem,
}: SavedItemsProps) {
  const router = useRouter();
  const [, startRefresh] = useTransition();

  const [status, setStatus] = useState<StatusFilter>("wanted");
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState("");

  // Changes you've just made, shown until the server's copy catches up. Each
  // is an item's new list ids; no lists means it was deleted.
  const [overrides, setOverrides] = useState<Record<string, string[]>>({});
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [seenItems, setSeenItems] = useState(items);
  if (items !== seenItems) {
    setSeenItems(items);
    setOverrides((prev) => Object.fromEntries(Object.entries(prev).filter(([id]) => pendingIds.has(id))));
  }

  const listsById = useMemo(() => new Map(lists.map((list) => [list.id, list])), [lists]);
  const current = useMemo(
    () =>
      items
        .map((item) => (overrides[item.id] ? { ...item, listIds: overrides[item.id] } : item))
        .filter((item) => item.listIds.length > 0),
    [items, overrides],
  );

  const ownWishlist = lists.find((list) => list.isOwnWishlist) ?? null;
  const saveTo = ownWishlist ?? lists[0] ?? null;
  const hidesSome = lists.some((list) => list.hidesReservations);

  const q = query.trim().toLowerCase();
  const matching = current.filter((item) => !q || item.title.toLowerCase().includes(q));
  const counts: Record<StatusFilter, number> = {
    wanted: matching.filter((item) => matchesStatus(item, "wanted")).length,
    gifted: matching.filter((item) => matchesStatus(item, "gifted")).length,
    all: matching.length,
  };
  const shown = matching.filter((item) => matchesStatus(item, status));
  const selected = current.filter((item) => selectedIds.has(item.id));
  const allShownSelected = shown.length > 0 && shown.every((item) => selectedIds.has(item.id));
  const someShownSelected = shown.some((item) => selectedIds.has(item.id));

  const listIdsOf = (id: string) => current.find((item) => item.id === id)?.listIds ?? [];

  /** Puts items on a list or takes them off, showing it before the server answers. */
  const changeLists = async (ids: string[], listId: string, on: boolean): Promise<string | null> => {
    const before = new Map(ids.map((id) => [id, listIdsOf(id)]));
    setOverrides((prev) => {
      const next = { ...prev };
      for (const [id, listIds] of before) {
        next[id] = on ? (listIds.includes(listId) ? listIds : [...listIds, listId]) : listIds.filter((l) => l !== listId);
      }
      return next;
    });
    setPendingIds((prev) => new Set([...prev, ...ids]));

    let message: string | null;
    try {
      message = errorOf(await (on ? addAction : removeAction)(ids, listId));
    } catch {
      message = "Something went wrong. Try again in a moment.";
    }

    setPendingIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.delete(id);
      return next;
    });
    if (message) {
      setOverrides((prev) => ({ ...prev, ...Object.fromEntries(before) }));
      return message;
    }
    if (!on) {
      // Deleted items can't stay selected.
      const gone = ids.filter((id) => (before.get(id) ?? []).every((l) => l === listId));
      if (gone.length > 0) setSelectedIds((prev) => new Set([...prev].filter((id) => !gone.includes(id))));
    }
    startRefresh(() => router.refresh());
    return null;
  };

  const toggleItemList = async (item: SavedItem, listId: string, on: boolean) => {
    setNotice("");
    const deleting = !on && item.listIds.length === 1;
    const message = await changeLists([item.id], listId, on);
    if (deleting) setNotice(message ? `“${item.title}” wasn't deleted. ${message}` : `Deleted “${item.title}”.`);
    return message;
  };

  const bulkAdd = async (list: SavedList) => {
    setNotice("");
    const ids = selected.filter((item) => !item.listIds.includes(list.id)).map((item) => item.id);
    if (ids.length === 0) return null;
    const message = await changeLists(ids, list.id, true);
    if (!message) {
      setSelectedIds(new Set());
      setNotice(`Added ${countLabel(ids.length)} to ${list.title}.`);
    }
    return message;
  };

  const bulkRemove = async (list: SavedList) => {
    setNotice("");
    const onIt = selected.filter((item) => item.listIds.includes(list.id));
    if (onIt.length === 0) return null;
    const deleted = onIt.filter((item) => item.listIds.length === 1).length;
    const message = await changeLists(
      onIt.map((item) => item.id),
      list.id,
      false,
    );
    if (!message) {
      setSelectedIds(new Set());
      setNotice(
        `Took ${countLabel(onIt.length)} off ${list.title}.` +
          (deleted === 0
            ? ""
            : deleted === 1
              ? " One was on no other list, so it's deleted."
              : ` ${deleted} were on no other list, so they're deleted.`),
      );
    }
    return message;
  };

  const setItemSelected = (id: string, on: boolean) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const selectAllShown = (on: boolean) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const item of shown) {
        if (on) next.add(item.id);
        else next.delete(item.id);
      }
      return next;
    });

  let noMatches = "";
  if (shown.length === 0) {
    if (q) noMatches = `Nothing matches “${query.trim()}”.`;
    else if (status === "wanted") noMatches = "Nothing still wanted. Everything is gifted or you have it.";
    else if (status === "gifted") noMatches = "No gifts yet.";
  }

  const saveButton = saveTo ? (
    renderSaveItem ? (
      renderSaveItem(lists, saveTo.id)
    ) : (
      <AddItemDialog
        // A new wishlist becomes the default, so start the dialog over.
        key={saveTo.id}
        registryId={saveTo.id}
        categories={saveTo.categories}
        registryType={saveTo.registryType}
        eventType={saveTo.eventType}
        saveTo={lists.map((list) => ({
          id: list.id,
          title: list.title,
          categories: list.categories,
          registryType: list.registryType,
          eventType: list.eventType,
        }))}
        onAdded={() => startRefresh(() => router.refresh())}
        trigger={
          <Button>
            <span className="inline-flex items-center gap-1.5">
              <Plus aria-hidden="true" className="h-4 w-4 shrink-0" />
              Save an item
            </span>
          </Button>
        }
      />
    )
  ) : null;

  return (
    // Left-aligned in the page container, under the dashboard tabs. The Saved
    // tab is the visible title.
    <div className="container mx-auto px-4 pt-6 pb-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="sr-only">Saved</h1>
          <p className="text-tertiary">Everything on your lists, in one place.</p>
        </div>
        {saveButton && <div className="shrink-0">{saveButton}</div>}
      </div>

      {!ownWishlist && <StartWishlistCallout action={startWishlistAction} hasLists={lists.length > 0} />}

      {current.length === 0 ? (
        <EmptyState hasLists={lists.length > 0} />
      ) : (
        <section aria-label="Your saved items" className="mt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <AriaToggleButtonGroup
              aria-label="Which items to show"
              selectionMode="single"
              disallowEmptySelection
              selectedKeys={[status]}
              onSelectionChange={(keys) => {
                const [key] = [...keys];
                if (key) setStatus(key as StatusFilter);
              }}
              // Fills the width on phones, and scrolls inside itself if big
              // counts don't fit.
              className="scrollbar-hide flex w-full overflow-x-auto rounded-lg bg-secondary_alt p-0.5 ring-1 ring-secondary ring-inset sm:inline-flex sm:w-auto"
            >
              {STATUS_FILTERS.map((filter) => (
                <AriaToggleButton
                  key={filter.id}
                  id={filter.id}
                  className={({ isSelected, isHovered, isFocusVisible }) =>
                    cx(
                      "inline-flex flex-1 cursor-pointer items-center justify-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-semibold whitespace-nowrap outline-focus-ring transition-colors sm:flex-none sm:gap-1.5 sm:px-3",
                      isSelected
                        ? "bg-primary_alt text-secondary shadow-xs ring-1 ring-primary ring-inset"
                        : isHovered
                          ? "text-secondary"
                          : "text-tertiary",
                      isFocusVisible && "outline-2 -outline-offset-2",
                    )
                  }
                >
                  {filter.label}
                  <span className="rounded-full bg-secondary px-1.5 text-xs font-medium text-tertiary tabular-nums">
                    {counts[filter.id]}
                  </span>
                </AriaToggleButton>
              ))}
            </AriaToggleButtonGroup>
            <Input
              type="search"
              aria-label="Search your saved items"
              placeholder="Search by name"
              icon={SearchLg}
              value={query}
              onChange={setQuery}
              className="sm:max-w-64"
            />
          </div>

          {hidesSome && (
            <p className="mt-3 flex items-start gap-1.5 text-sm text-tertiary">
              <EyeOff aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              On lists where you hide what&apos;s been reserved, items show as still wanted.
            </p>
          )}

          <div className="mt-4 flex min-h-5 flex-wrap items-center justify-between gap-x-4 gap-y-2">
            {shown.length > 0 && (
              <Checkbox
                label="Select all shown"
                isSelected={allShownSelected}
                isIndeterminate={someShownSelected && !allShownSelected}
                onChange={selectAllShown}
              />
            )}
            <p role="status" className="text-sm text-secondary">
              {notice}
            </p>
          </div>

          {shown.length === 0 ? (
            <div className="mt-3 rounded-xl border border-dashed border-secondary px-4 py-8 text-center">
              <p className="text-sm text-tertiary">{noMatches}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStatus("all");
                  setQuery("");
                }}
                className="mt-3"
              >
                Show everything
              </Button>
            </div>
          ) : (
            <ul aria-label="Saved items" className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {shown.map((item) => (
                <SavedItemCard
                  key={item.id}
                  item={item}
                  lists={lists}
                  listsById={listsById}
                  selected={selectedIds.has(item.id)}
                  pending={pendingIds.has(item.id)}
                  onSelect={(on) => setItemSelected(item.id, on)}
                  onToggleList={(listId, on) => toggleItemList(item, listId, on)}
                />
              ))}
            </ul>
          )}
        </section>
      )}

      {selected.length > 0 && (
        <BulkBar
          selected={selected}
          lists={lists}
          onAdd={bulkAdd}
          onRemove={bulkRemove}
          onClear={() => setSelectedIds(new Set())}
        />
      )}
    </div>
  );
}
