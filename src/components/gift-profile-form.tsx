"use client";

import { useState, type FormEvent } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";
import {
  BIRTHDAY_REMINDER_DAYS,
  MAX_SIZE_LENGTH,
  MAX_TAG_LENGTH,
  MAX_TAGS,
  MAX_TEXT_LENGTH,
  MONTH_OPTIONS,
  SIZE_LABELS,
  daysInMonth,
  parseGiftProfile,
  type GiftProfile,
  type GiftProfileSizes,
} from "@/lib/gift-profile";
import { cx } from "@/lib/utils/cx";

export type SaveGiftProfile = (profile: GiftProfile) => Promise<{ success?: boolean; error?: string | null }>;

export interface GiftProfileFormProps {
  initial: GiftProfile;
  /** Saves the profile. Pages pass a server action, stories a stand-in. */
  onSave: SaveGiftProfile;
  /**
   * Set for a list kept for a child: whose profile this is, like "Toto".
   * Without a name, the labels say "your child".
   */
  child?: { name?: string | null };
}

const SIZE_FIELDS: { key: keyof GiftProfileSizes; placeholder: string }[] = [
  { key: "tops", placeholder: "M" },
  { key: "bottoms", placeholder: "32 x 30" },
  { key: "shoes", placeholder: "9" },
  { key: "other", placeholder: "Ring 7, hat L" },
];

/** Adds tags to a list, skipping blanks and repeats, up to the limit. */
function addTags(tags: string[], entries: string[]): string[] {
  const next = [...tags];
  const seen = new Set(next.map((tag) => tag.toLowerCase()));
  for (const entry of entries) {
    const tag = entry.trim().replace(/\s+/g, " ").slice(0, MAX_TAG_LENGTH);
    if (!tag || seen.has(tag.toLowerCase())) continue;
    if (next.length >= MAX_TAGS) break;
    seen.add(tag.toLowerCase());
    next.push(tag);
  }
  return next;
}

const selectClass =
  "w-full appearance-none rounded-lg bg-primary py-2 pr-9 pl-3 text-md text-primary shadow-xs ring-1 ring-primary outline-hidden transition duration-100 ease-linear ring-inset focus-visible:ring-2 focus-visible:ring-brand";

/** A native select, so phones show their own picker. */
function PlainSelect({
  label,
  value,
  onChange,
  placeholder,
  options,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  options: { value: number; label: string }[];
  className?: string;
}) {
  return (
    <div className={cx("relative grid items-center", className)}>
      <select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className={selectClass}>
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={String(option.value)}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown aria-hidden="true" className="pointer-events-none absolute right-3 size-4 text-fg-quaternary" />
    </div>
  );
}

function TagField({
  label,
  hint,
  placeholder,
  tags,
  draft,
  onTagsChange,
  onDraftChange,
}: {
  label: string;
  hint: string;
  placeholder: string;
  tags: string[];
  draft: string;
  onTagsChange: (tags: string[]) => void;
  onDraftChange: (draft: string) => void;
}) {
  const full = tags.length >= MAX_TAGS;

  const handleChange = (value: string) => {
    // A comma ends a tag, so pasting "tea, puzzles" adds both.
    if (value.includes(",")) {
      const parts = value.split(",");
      const rest = parts.pop() ?? "";
      onTagsChange(addTags(tags, parts));
      onDraftChange(rest.trimStart());
    } else {
      onDraftChange(value);
    }
  };

  const handleKeyDown = (e: { key: string; preventDefault: () => void }) => {
    if (e.key === "Enter") {
      // Add the tag instead of submitting the form.
      e.preventDefault();
      if (draft.trim()) {
        onTagsChange(addTags(tags, [draft]));
        onDraftChange("");
      }
    } else if (e.key === "Backspace" && !draft && tags.length) {
      onTagsChange(tags.slice(0, -1));
    }
  };

  return (
    <div className="space-y-2">
      <Input
        label={label}
        value={draft}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={full ? undefined : placeholder}
        maxLength={MAX_TAG_LENGTH}
        isDisabled={full}
        hint={full ? `That's the most you can add (${MAX_TAGS}).` : hint}
      />
      {tags.length > 0 && (
        <ul aria-label={label} className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <li
              key={tag}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-secondary py-0.5 pr-1 pl-2.5 text-sm font-medium text-secondary"
            >
              <span className="truncate">{tag}</span>
              <button
                type="button"
                onClick={() => onTagsChange(tags.filter((t) => t !== tag))}
                aria-label={`Remove ${tag}`}
                className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-fg-quaternary hover:bg-primary_hover hover:text-fg-quaternary_hover focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus-ring"
              >
                <X className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Birthday, sizes, colors, likes, things to skip and notes, for givers. */
export function GiftProfileForm({ initial, onSave, child }: GiftProfileFormProps) {
  const [month, setMonth] = useState(initial.birthday ? String(initial.birthday.month) : "");
  const [day, setDay] = useState(initial.birthday ? String(initial.birthday.day) : "");
  const [sizes, setSizes] = useState<GiftProfileSizes>(initial.sizes ?? {});
  const [colors, setColors] = useState(initial.colors ?? "");
  const [likes, setLikes] = useState<string[]>(initial.likes ?? []);
  const [likeDraft, setLikeDraft] = useState("");
  const [skip, setSkip] = useState<string[]>(initial.skip ?? []);
  const [skipDraft, setSkipDraft] = useState("");
  const [notes, setNotes] = useState(initial.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const childName = child?.name?.trim() || null;
  // "Toto's birthday" for a child's list, "Birthday" for your own.
  const title = (label: string) =>
    child ? `${childName ? `${childName}'s` : "Your child's"} ${label.toLowerCase()}` : label;
  const whose = childName ? `${childName}'s` : "your child's";

  const dayOptions = Array.from({ length: month ? daysInMonth(Number(month)) : 31 }, (_, i) => ({
    value: i + 1,
    label: String(i + 1),
  }));

  const handleMonthChange = (next: string) => {
    setMonth(next);
    setSaved(false);
    if (day && next && Number(day) > daysInMonth(Number(next))) setDay("");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSaved(false);

    if (Boolean(month) !== Boolean(day)) {
      setError(month ? "Pick a day for the birthday too." : "Pick a month for the birthday too.");
      return;
    }

    // Keep anything typed in a tag box that wasn't added yet.
    const allLikes = addTags(likes, [likeDraft]);
    const allSkip = addTags(skip, [skipDraft]);
    setLikes(allLikes);
    setSkip(allSkip);
    setLikeDraft("");
    setSkipDraft("");

    const profile = parseGiftProfile({
      birthday: month && day ? { month: Number(month), day: Number(day) } : null,
      sizes,
      colors,
      likes: allLikes,
      skip: allSkip,
      notes,
    });

    setSaving(true);
    try {
      const result = await onSave(profile);
      if (result?.error) {
        setError(result.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch {
      setError("We couldn't save that. Try again in a moment.");
    }
    setSaving(false);
  };

  const legendClass = "mb-1.5 text-sm font-medium text-secondary";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <fieldset>
        <legend className={legendClass}>{title("Birthday")}</legend>
        <div className="flex gap-3">
          <PlainSelect
            label={`${title("Birthday")}: month`}
            value={month}
            onChange={handleMonthChange}
            placeholder="Month"
            options={MONTH_OPTIONS}
            className="min-w-0 flex-[2]"
          />
          <PlainSelect
            label={`${title("Birthday")}: day`}
            value={day}
            onChange={(next) => {
              setDay(next);
              setSaved(false);
            }}
            placeholder="Day"
            options={dayOptions}
            className="min-w-0 flex-1"
          />
        </div>
        <p className="mt-1.5 text-sm text-tertiary">
          {child
            ? `No year needed. Only you and followers you approve see ${whose} birthday, and only while this list is on your profile.`
            : `No year needed. Only you and followers you approve see it, and they get a reminder ${BIRTHDAY_REMINDER_DAYS} days before.`}
        </p>
      </fieldset>

      <fieldset>
        <legend className={legendClass}>{title("Sizes")}</legend>
        <div className="grid grid-cols-2 gap-3">
          {SIZE_FIELDS.map(({ key, placeholder }) => (
            <Input
              key={key}
              label={SIZE_LABELS[key]}
              value={sizes[key] ?? ""}
              onChange={(value) => setSizes((current) => ({ ...current, [key]: value }))}
              placeholder={placeholder}
              maxLength={MAX_SIZE_LENGTH}
            />
          ))}
        </div>
      </fieldset>

      <Input
        label="Favorite colors"
        value={colors}
        onChange={setColors}
        placeholder="Green, gold, anything sparkly"
        maxLength={MAX_TEXT_LENGTH}
      />

      <TagField
        label="Likes"
        hint="Type one and press Enter, or separate them with commas."
        placeholder="Tea, puzzles, hiking"
        tags={likes}
        draft={likeDraft}
        onTagsChange={setLikes}
        onDraftChange={setLikeDraft}
      />

      <TagField
        label="Please skip"
        hint={
          child
            ? `Things ${childName ?? "your child"} already has or shouldn't get.`
            : "Things you already have or don't want."
        }
        placeholder="Candles, mugs"
        tags={skip}
        draft={skipDraft}
        onTagsChange={setSkip}
        onDraftChange={setSkipDraft}
      />

      <TextArea
        label="Notes"
        value={notes}
        onChange={setNotes}
        placeholder="Anything else givers should know"
        maxLength={MAX_TEXT_LENGTH}
        rows={3}
      />

      {error && (
        <p role="alert" className="text-sm text-error-primary">
          {error}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
        <span role="status" className="inline-flex items-center gap-1 text-sm text-tertiary">
          {saved && (
            <>
              <Check className="h-4 w-4" aria-hidden />
              Saved
            </>
          )}
        </span>
      </div>
    </form>
  );
}
