import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { GroupManager } from "./group-manager";

const ok = fn(async () => ({ error: null }));

const members = [
  { id: "m1", name: "Grandma Rose", email: null },
  { id: "m2", name: "Ann Chen", email: "ann@example.com" },
  { id: "m3", name: "Ben Chen", email: "ben@example.com" },
  { id: "m4", name: "Lily Chen", email: "lily@example.com" },
];

const meta: Meta<typeof GroupManager> = {
  title: "Components/GroupManager",
  component: GroupManager,
  parameters: { layout: "padded" },
  args: {
    group: { id: "group-1", name: "The Chens" },
    members,
    events: [],
    sharedLists: [],
    actions: {
      rename: ok,
      remove: ok,
      addMembers: fn(async () => ({ error: null, added: 1, alreadyListed: 0 })),
      removeMember: ok,
      startExchange: fn(async () => ({ error: null, id: "event-1" })),
    },
  },
};
export default meta;
type Story = StoryObj<typeof GroupManager>;

/** A new group: no exchange yet, and no lists shared with it. */
export const NewGroup: Story = {};

/**
 * A family that ran a Secret Santa last year. Starting this year's copies it,
 * so nobody draws the same person.
 */
export const AfterLastYearsExchange: Story = {
  args: {
    events: [
      {
        id: "event-2025",
        slug: "the-chens-gift-exchange-k2m9",
        title: "The Chens gift exchange",
        event_date: "2025-12-20",
        created_at: "2025-11-01T10:00:00Z",
        hasExchange: true,
        drawn: true,
      },
      {
        id: "event-bbq",
        slug: "summer-bbq-p3x8",
        title: "Summer BBQ",
        event_date: "2026-07-04",
        created_at: "2026-06-01T10:00:00Z",
        hasExchange: false,
        drawn: false,
      },
    ],
    sharedLists: [{ id: "reg-1", slug: "anns-wishlist", title: "Ann's Christmas wishlist" }],
  },
};

/** Nobody added yet, so there's no exchange to start. */
export const Empty: Story = { args: { members: [] } };
