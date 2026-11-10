import Link from "next/link";
import {
  CalendarHeart,
  Cake,
  Gift,
  Mail,
  Settings,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { DEMO_ME, demoProfilePath } from "@/lib/demo-people";

type Stop = { href: string; icon: LucideIcon; title: string; body: string };

const AS_OWNER: Stop[] = [
  {
    href: "/demo/dashboard/registry/baby",
    icon: Gift,
    title: "Manage the baby registry",
    body: "Items from any store, gift activity, guest suggestions and store perks.",
  },
  {
    href: "/demo/dashboard/registry/wishlist",
    icon: Cake,
    title: "Max's birthday wishlist",
    body: "A personal registry, private to approved followers.",
  },
  {
    href: "/demo/dashboard/events/baby-shower",
    icon: CalendarHeart,
    title: "Track the shower's RSVPs",
    body: "Guest list, reminders, and who's bringing how many.",
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
];

const AS_GUEST: Stop[] = [
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
    body: "The invitation as Jordan, a guest who hasn't replied yet.",
  },
  {
    href: demoProfilePath(DEMO_ME),
    icon: UserRound,
    title: "Remi & Max's profile",
    body: "One link to every registry they chose to share.",
  },
];

function StopLink({ stop }: { stop: Stop }) {
  const Icon = stop.icon;
  return (
    <li>
      <Link
        href={stop.href}
        className="group flex items-start gap-3 rounded-xl p-2 outline-focus-ring transition-colors hover:bg-primary focus-visible:outline-2"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary shadow-xs">
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

/**
 * The demo dashboard's guide: where to look for each feature, on the owner's
 * side and as a guest.
 */
export function DemoTour() {
  return (
    <section aria-labelledby="demo-tour-heading" className="rounded-2xl bg-brand-50 p-5">
      <h2 id="demo-tour-heading" className="text-lg font-semibold text-primary">
        Explore the demo
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-secondary">
        You&apos;re signed in as Remi & Max. They&apos;re expecting a baby, Max turns 30 soon, and their friends are
        planning a shower. Everything here is sample data, so click anything.
      </p>
      <div className="mt-4 grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div>
          <h3 className="px-2 text-xs font-semibold tracking-wide text-tertiary uppercase">As Remi & Max</h3>
          <ul className="mt-1 grid gap-1 sm:grid-cols-2">
            {AS_OWNER.map((stop) => (
              <StopLink key={stop.href} stop={stop} />
            ))}
          </ul>
        </div>
        <div>
          <h3 className="px-2 text-xs font-semibold tracking-wide text-tertiary uppercase">As a guest</h3>
          <ul className="mt-1 grid gap-1">
            {AS_GUEST.map((stop) => (
              <StopLink key={stop.href} stop={stop} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
