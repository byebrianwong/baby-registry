import type { ComponentType, ReactNode } from "react";
import { Ban, Cake, Heart, Palette, Ruler, StickyNote } from "lucide-react";
import { formatBirthday, hasGiftDetails, sizeSummary, type GiftProfile } from "@/lib/gift-profile";
import { cx } from "@/lib/utils/cx";

export interface GiftProfileCardProps {
  profile: GiftProfile;
  /** Whose profile it is, as in "About Dorothy". */
  name: string;
  /**
   * Shows the birthday. Only for the person themselves and the followers they
   * approved, never for everyone with a link.
   */
  showBirthday?: boolean;
  /** Goes next to the heading, like an Edit link on your own profile. */
  action?: ReactNode;
  className?: string;
}

function Chips({ tags, tone }: { tags: string[]; tone: "like" | "skip" }) {
  return (
    <ul className="flex flex-wrap items-center gap-1.5">
      {tags.map((tag) => (
        <li
          key={tag}
          className={cx(
            "max-w-full truncate rounded-full px-2.5 py-0.5 text-xs font-medium",
            tone === "like"
              ? "bg-brand-primary text-brand-secondary"
              : "bg-primary text-tertiary ring-1 ring-secondary ring-inset",
          )}
        >
          {tag}
        </li>
      ))}
    </ul>
  );
}

function Row({
  icon: Icon,
  label,
  children,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-fg-quaternary" aria-hidden />
      <div className="min-w-0 flex-1">
        <dt className="text-xs font-medium text-tertiary">{label}</dt>
        <dd className="mt-0.5 break-words text-sm text-primary">{children}</dd>
      </div>
    </div>
  );
}

/**
 * What someone likes and their sizes, for the people giving them gifts.
 * Renders nothing when there's nothing to show.
 */
export function GiftProfileCard({ profile, name, showBirthday = false, action, className }: GiftProfileCardProps) {
  const birthday = showBirthday && profile.birthday ? formatBirthday(profile.birthday) : null;
  if (!hasGiftDetails(profile) && !birthday) return null;

  const sizes = sizeSummary(profile.sizes);
  const likes = profile.likes ?? [];
  const skip = profile.skip ?? [];

  return (
    <section className={cx("rounded-2xl border border-secondary bg-primary p-4", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="min-w-0 break-words font-semibold text-primary">About {name}</h2>
        {action}
      </div>
      <dl className="mt-3 space-y-3">
        {birthday && (
          <Row icon={Cake} label="Birthday">
            {birthday}
          </Row>
        )}
        {sizes.length > 0 && (
          <Row icon={Ruler} label="Sizes">
            <ul className="flex flex-wrap gap-x-3 gap-y-0.5">
              {sizes.map((size) => (
                <li key={size}>{size}</li>
              ))}
            </ul>
          </Row>
        )}
        {profile.colors && (
          <Row icon={Palette} label="Favorite colors">
            {profile.colors}
          </Row>
        )}
        {likes.length > 0 && (
          <Row icon={Heart} label="Likes">
            <Chips tags={likes} tone="like" />
          </Row>
        )}
        {skip.length > 0 && (
          <Row icon={Ban} label="Please skip">
            <Chips tags={skip} tone="skip" />
          </Row>
        )}
        {profile.notes && (
          <Row icon={StickyNote} label="Notes">
            <p className="whitespace-pre-line">{profile.notes}</p>
          </Row>
        )}
      </dl>
    </section>
  );
}
