import type { Meta, StoryObj } from "@storybook/react";
import { DashboardRegistryCard, type DashboardRegistryCardProps } from "./dashboard-registry-card";

// A fixed "today", so the countdowns don't change from day to day in Chromatic.
const TODAY = "2026-11-07";

const base: DashboardRegistryCardProps = {
  title: "Remi & Max's Baby Registry",
  registryType: "baby",
  eventType: null,
  eventDate: "2027-03-14",
  today: TODAY,
  totalItems: 32,
  fulfilledItems: 9,
  totalValue: 3784,
  recentActivity: [
    { id: "1", name: "Auntie Glinda", action: "reserved an item" },
    { id: "2", name: "Grandma Dorothy", action: "reserved an item" },
  ],
  manageHref: "/dashboard/registry/demo",
  publicHref: "/r/demo",
};

const meta: Meta<typeof DashboardRegistryCard> = {
  title: "Components/DashboardRegistryCard",
  component: DashboardRegistryCard,
  args: base,
  decorators: [
    (Story) => (
      <div className="max-w-sm p-6">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof DashboardRegistryCard>;

export const Baby: Story = {};

export const Birthday: Story = {
  args: {
    title: "Maya turns 30",
    registryType: "personal",
    eventType: "birthday",
    eventDate: "2026-11-19",
    totalItems: 10,
    fulfilledItems: 4,
    totalValue: 640,
    recentActivity: [{ id: "1", name: "Jamie K.", action: "reserved an item" }],
  },
};

export const ChristmasTomorrow: Story = {
  args: {
    title: "The Parks' Christmas list",
    registryType: "personal",
    eventType: "christmas",
    eventDate: "2026-11-08",
    totalItems: 6,
    fulfilledItems: 1,
    totalValue: 310,
    recentActivity: [],
  },
};

export const WeddingAllDone: Story = {
  args: {
    title: "Ana & Leo's Wedding",
    registryType: "personal",
    eventType: "wedding",
    eventDate: "2026-09-06",
    totalItems: 18,
    fulfilledItems: 18,
    totalValue: 2150,
    recentActivity: [{ id: "1", name: "Cousin Toto", action: "reserved an item" }],
  },
};

export const SharedNoDate: Story = {
  args: {
    title: "Office Holiday Swap",
    registryType: "personal",
    eventType: "other",
    eventDate: null,
    totalItems: 0,
    fulfilledItems: 0,
    totalValue: 0,
    recentActivity: [],
    badge: "Manager",
  },
};
