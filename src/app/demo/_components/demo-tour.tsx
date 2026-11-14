import Link from "next/link";
import {
  Baby,
  CalendarHeart,
  Cake,
  CookingPot,
  Gift,
  HandCoins,
  ListChecks,
  Mail,
  Settings,
  Shuffle,
  TreePine,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { DEMO_STROLLER_GROUP_GIFT_TOKEN } from "@/lib/demo-group-gifts";
import { DEMO_ME, demoProfilePath } from "@/lib/demo-people";
import { groupGiftPath } from "@/lib/group-gifts";
import { eventTheme, type EventType } from "@/lib/events";
import { cx } from "@/lib/utils/cx";

type Stop = { href: string; icon: LucideIcon; title: string; body: string };

/** One celebration to try: what Remi & Max do as hosts, and what their guests do. */
type Track = {
  id: string;
  occasion: EventType;
  icon: LucideIcon;
  title: string;
  intro: string;
  hosts: Stop[];
  guests: Stop[];
};

const TRACKS: Track[] = [
  {
    id: "baby-shower",
    occasion: "baby_shower",
    icon: Baby,
    title: "A baby shower",
    intro: "Remi & Max are expecting. Glinda is throwing them a shower and lining up meals for after the baby comes.",
    hosts: [
      {
        href: "/demo/dashboard/registry/baby",
        icon: Gift,
        title: "Manage the baby registry",
        body: "Items from any store, gift activity, suggestions and store perks.",
      },
      {
        href: "/demo/dashboard/events/baby-shower",
        icon: CalendarHeart,
        title: "Co-host the shower",
        body: "RSVPs, guests' answers, reminders and messages.",
      },
    ],
    guests: [
      {
        href: "/demo",
        icon: Gift,
        title: "Reserve a gift",
        body: "No account needed. Guests see the address after reserving.",
      },
      {
        href: "/demo/e/remi-and-max-baby-shower?g=demo-s8",
        icon: Mail,
        title: "RSVP to the shower",
        body: "As Jordan, who hasn't replied yet.",
      },
      {
        href: groupGiftPath(DEMO_STROLLER_GROUP_GIFT_TOKEN, "/demo"),
        icon: HandCoins,
        title: "Chip in on a group gift",
        body: "Shower guests are going in on the stroller. Chip in, or see it as Oz, who started it.",
      },
      {
        href: "/demo/e/meals-for-remi-and-max?g=demo-mt-g4",
        icon: CookingPot,
        title: "Sign up to bring a meal",
        body: "As Oz. The address shows once you pick a night.",
      },
    ],
  },
  {
    id: "family-christmas",
    occasion: "christmas",
    icon: TreePine,
    title: "A family Christmas",
    intro: "Remi & Max host Christmas dinner, where everyone gives everyone, and a Secret Santa with friends.",
    hosts: [
      {
        href: "/demo/dashboard/events/christmas",
        icon: TreePine,
        title: "Host Christmas dinner",
        body: "Who's coming, whose wish list is in, and who's bringing what.",
      },
      {
        href: "/demo/dashboard/events/secret-santa",
        icon: Shuffle,
        title: "Run a Secret Santa",
        body: "Names are drawn. Undo, keep a couple apart, and draw again.",
      },
      {
        href: "/demo/dashboard/registry/christmas-list",
        icon: ListChecks,
        title: "Your Christmas list",
        body: "What family can pick from, and what they've reserved.",
      },
    ],
    guests: [
      {
        href: "/demo/e/family-christmas?g=demo-c5",
        icon: Mail,
        title: "RSVP with your wish list",
        body: "As Nessa: see everyone's lists and pick a dish to bring.",
      },
      {
        href: "/demo/e/friendsmas-secret-santa?g=demo-ss2",
        icon: Shuffle,
        title: "See who you drew",
        body: "As Glinda, with her Secret Santa name and their wish list.",
      },
      {
        href: "/demo/r/lily-and-sams-christmas-list",
        icon: Gift,
        title: "Shop the kids' list",
        body: "Lily & Sam's list, with what's already been picked.",
      },
    ],
  },
];

const MORE: Stop[] = [
  {
    href: "/demo/dashboard/registry/wishlist",
    icon: Cake,
    title: "Max's birthday wishlist",
    body: "A personal registry, private to approved followers.",
  },
  {
    href: "/demo/dashboard/following",
    icon: Users,
    title: "Follow friends' registries",
    body: "Search for people and see what's coming up.",
  },
  {
    href: "/demo/dashboard/account#follows",
    icon: Settings,
    title: "Approve follow requests",
    body: "And choose which registries your profile shows.",
  },
  {
    href: demoProfilePath(DEMO_ME),
    icon: UserRound,
    title: "Remi & Max's profile",
    body: "One link to every registry they chose to share.",
  },
];

/** A link to one place in the demo. `onTint` is for the guide's tinted background, outside the cards. */
function StopLink({ stop, onTint = false }: { stop: Stop; onTint?: boolean }) {
  const Icon = stop.icon;
  return (
    <li>
      <Link
        href={stop.href}
        className={cx(
          "group flex items-start gap-3 rounded-xl p-2 outline-focus-ring transition-colors focus-visible:outline-2",
          onTint ? "hover:bg-primary" : "hover:bg-secondary",
        )}
      >
        <span
          className={cx(
            "flex size-9 shrink-0 items-center justify-center rounded-full",
            onTint ? "bg-primary shadow-xs" : "bg-brand-50",
          )}
        >
          <Icon aria-hidden="true" className="size-4.5 text-brand-600" />
        </span>
        <span className="min-w-0">
          <span className="block font-medium text-primary group-hover:underline">{stop.title}</span>
          <span className="block text-sm text-tertiary">{stop.body}</span>
        </span>
      </Link>
    </li>
  );
}

function StopList({ heading, stops }: { heading: string; stops: Stop[] }) {
  return (
    <div>
      <h4 className="px-2 text-xs font-semibold tracking-wide text-tertiary uppercase">{heading}</h4>
      <ul className="mt-1 grid gap-1">
        {stops.map((stop) => (
          <StopLink key={stop.href} stop={stop} />
        ))}
      </ul>
    </div>
  );
}

function TrackCard({ track }: { track: Track }) {
  const theme = eventTheme(track.occasion);
  const Icon = track.icon;
  return (
    <section aria-labelledby={`tour-${track.id}`} className="flex flex-col gap-4 rounded-xl bg-primary p-4 shadow-xs">
      <div className="flex items-start gap-3">
        <span className={cx("flex size-10 shrink-0 items-center justify-center rounded-full", theme.bg)}>
          <Icon aria-hidden="true" className={cx("size-5", theme.icon)} />
        </span>
        <div className="min-w-0">
          <h3 id={`tour-${track.id}`} className="font-semibold text-primary">
            {track.title}
          </h3>
          <p className="text-sm text-secondary">{track.intro}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <StopList heading="As Remi & Max" stops={track.hosts} />
        <StopList heading="As a guest" stops={track.guests} />
      </div>
    </section>
  );
}

/**
 * The demo dashboard's guide: two celebrations to try, a baby shower and a
 * family Christmas, each from the hosts' side and a guest's. Then the rest.
 */
export function DemoTour() {
  return (
    <section aria-labelledby="demo-tour-heading" className="rounded-2xl bg-brand-50 p-5">
      <h2 id="demo-tour-heading" className="text-lg font-semibold text-primary">
        Explore the demo
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-secondary">
        You&apos;re signed in as Remi & Max. Pick a celebration and try it as the hosts or as a guest. Everything here
        is sample data, so click anything.
      </p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {TRACKS.map((track) => (
          <TrackCard key={track.id} track={track} />
        ))}
      </div>
      <div className="mt-4">
        <h3 className="px-2 text-xs font-semibold tracking-wide text-tertiary uppercase">More to try</h3>
        <ul className="mt-1 grid gap-1 sm:grid-cols-2 xl:grid-cols-4">
          {MORE.map((stop) => (
            <StopLink key={stop.href} stop={stop} onTint />
          ))}
        </ul>
      </div>
    </section>
  );
}
