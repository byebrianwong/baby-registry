import Link from "next/link";
import { Calendar, LockOpen } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { RegistryAvatar } from "@/components/registry-avatar";

export interface PublicRegistryHeroProps {
  isBabyRegistry: boolean;
  title: string;
  photoUrl?: string | null;
  /** The honorees' names, for the avatar's initials. */
  names: string | null;
  /** YYYY-MM-DD */
  eventDate: string | null;
  description: string | null;
  fulfilledItems: number;
  totalItems: number;
  /** Who shared it, for registries on the owner's profile. */
  owner?: { name: string; path: string } | null;
  /** The Follow button under "Shared by", for anyone but the owner. */
  followButton?: React.ReactNode;
}

/**
 * The top of a shared registry page: the photo or initials, title, date,
 * welcome message and progress. The share page (src/app/r/[slug]/page.tsx)
 * and the demo both use it.
 */
export function PublicRegistryHero({
  isBabyRegistry,
  title,
  photoUrl,
  names,
  eventDate,
  description,
  fulfilledItems,
  totalItems,
  owner,
  followButton,
}: PublicRegistryHeroProps) {
  const progress = totalItems > 0 ? (fulfilledItems / totalItems) * 100 : 0;

  return (
    // Baby registries reserve 400px for the decorative illustrations;
    // personal registries size to content with a looser minimum, and tighten
    // further when there's no welcome message.
    <section
      className={`relative flex items-center justify-center bg-white py-12 ${
        isBabyRegistry ? "min-h-[400px]" : description ? "min-h-[260px]" : "min-h-[200px]"
      }`}
    >
      {/* Decorative illustrations — baby-specific; personal registries keep
          a clean hero. Pinned to a 1440px canvas. */}
      {isBabyRegistry && (
        <div className="pointer-events-none absolute inset-0 mx-auto hidden max-w-[1440px] lg:block" aria-hidden="true">
          {/* Left side */}
          <img src="/hero/star-teal-left.svg" alt="" className="absolute left-[89px] top-[108px] w-[62px] h-[63px]" />
          <img src="/hero/heart-red.svg" alt="" className="absolute left-[174px] top-[33px] w-[70px] h-[57px]" />
          <img src="/hero/panda.svg" alt="" className="absolute left-[209px] top-[98px] w-[192px] h-[220px]" />
          <img src="/hero/spoon-and-fork.svg" alt="" className="absolute left-[44px] top-[230px] w-[99px] h-[112px] -rotate-[29deg]" />
          {/* Right side */}
          <img src="/hero/heart-yellow.svg" alt="" className="absolute right-[134px] top-[45px] w-[55px] h-[45px]" />
          <img src="/hero/bottle.svg" alt="" className="absolute right-[284px] top-[71px] w-[72px] h-[122px] rotate-[21deg]" />
          <img src="/hero/bib.svg" alt="" className="absolute right-[55px] top-[139px] w-[113px] h-[96px] rotate-[4deg]" />
          <img src="/hero/socks.svg" alt="" className="absolute right-[245px] top-[265px] w-[130px] h-[105px]" />
          <img src="/hero/star-teal-right.svg" alt="" className="absolute right-[62px] top-[284px] w-[62px] h-[63px]" />
        </div>
      )}
      {/* Center content */}
      <div className="relative z-10 flex max-w-[575px] flex-col items-center gap-4 px-4 text-center">
        <RegistryAvatar photoUrl={photoUrl} names={names} />
        <h1 className="text-4xl font-bold leading-[44px] tracking-tight text-primary">{title}</h1>
        {eventDate && (
          <p className="flex items-center gap-2 text-secondary">
            <Calendar className="h-4 w-4" />
            {new Date(eventDate + "T00:00:00").toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        )}
        {description && <p className="text-secondary whitespace-pre-line">{description}</p>}
        <div className="w-full max-w-[566px]">
          <div className="flex justify-between text-sm text-secondary mb-1">
            <span>
              {fulfilledItems} of {totalItems} gifts fulfilled
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} aria-label="Gifts fulfilled" />
        </div>
        <p className="inline-flex items-center gap-1.5 text-xs text-tertiary">
          <LockOpen className="h-3.5 w-3.5" />
          Reserve a gift in 10 seconds — no sign-up required.
        </p>
        {owner && (
          <div className="flex flex-col items-center gap-2 border-t border-secondary pt-4">
            <p className="text-sm text-secondary">
              Shared by{" "}
              <Link href={owner.path} className="font-medium text-primary underline-offset-2 hover:underline">
                {owner.name}
              </Link>
            </p>
            {followButton}
          </div>
        )}
      </div>
    </section>
  );
}
