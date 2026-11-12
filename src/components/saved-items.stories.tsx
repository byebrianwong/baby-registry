import type { Meta, StoryObj } from "@storybook/react";
import { screen } from "storybook/test";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SavedItem, SavedList } from "@/lib/saved-items";
import { SavedSkeleton } from "./page-skeletons";
import { SavedItems } from "./saved-items";

// Server actions can't run in Storybook, so these pretend to work. The
// component shows each change straight away, so ticking lists and the bulk
// actions all work here.
const mockAdd = async (itemIds: string[]) => ({ success: true as const, changed: itemIds.length, deleted: 0 });
const mockRemove = async (itemIds: string[]) => ({ success: true as const, changed: itemIds.length, deleted: 0 });
const mockStart = async () => ({ registryId: "my-wishlist" });

function list(overrides: Partial<SavedList> & Pick<SavedList, "id" | "title">): SavedList {
  return {
    registryType: "personal",
    eventType: "other",
    kindLabel: "Wishlist",
    forChild: null,
    isOwnWishlist: false,
    hidesReservations: false,
    categories: [],
    ...overrides,
  };
}

const myWishlist = list({ id: "my-wishlist", title: "Sam's Wishlist", isOwnWishlist: true });
const kidsList = list({ id: "kids-list", title: "Max's Wishlist", forChild: "Max" });
const birthday = list({ id: "birthday", title: "Sam Turns 30", eventType: "birthday", kindLabel: "Birthday" });
const babyRegistry = list({
  id: "baby-registry",
  title: "Sam & Alex's Baby Registry",
  registryType: "baby",
  eventType: null,
  kindLabel: "Baby registry",
  categories: [
    { id: "nursery", name: "Nursery & Sleep" },
    { id: "gear", name: "Gear & Travel" },
  ],
});

function item(
  id: string,
  title: string,
  price: number | null,
  externalUrl: string | null,
  listIds: string[],
  status: SavedItem["status"] = "wanted",
): SavedItem {
  return { id, title, imageUrl: null, externalUrl, price, createdAt: `2026-11-${id.padStart(2, "0")}T12:00:00Z`, listIds, status };
}

const items: SavedItem[] = [
  item("9", "Wireless noise-cancelling headphones", 249.99, "https://www.example.com/headphones", ["my-wishlist", "birthday"]),
  item("8", "Rain boots, size 8", 68, "https://shoes.example.com/rain-boots", ["my-wishlist"]),
  item("7", "Gingham picnic blanket", 45, "https://www.example.com/picnic-blanket", ["my-wishlist", "baby-registry"]),
  item("6", "Enameled cast iron Dutch oven, 5.5 quart", 420, "https://www.example.com/dutch-oven", ["my-wishlist"], "gifted"),
  item("5", "Hiking daypack", 129, "https://outdoors.example.com/daypack", ["my-wishlist"], "have"),
  item("4", "Wooden train set", 54.5, "https://toys.example.com/train-set", ["kids-list"]),
  item("3", "Dinosaur pajamas, 4T", 24, null, ["kids-list"], "gifted"),
  item("2", "Sound machine", 89.99, "https://www.example.com/sound-machine", ["baby-registry"]),
  item("1", "Muslin swaddles, 4-pack", 49.95, "https://www.example.com/swaddles", ["baby-registry", "my-wishlist"], "gifted"),
];

const meta: Meta<typeof SavedItems> = {
  title: "Components/SavedItems",
  component: SavedItems,
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true, navigation: { pathname: "/dashboard/saved" } },
  },
  args: {
    lists: [myWishlist, kidsList, birthday, babyRegistry],
    items,
    addAction: mockAdd,
    removeAction: mockRemove,
    startWishlistAction: mockStart,
    renderSaveItem: () => (
      <Button>
        <span className="inline-flex items-center gap-1.5">
          <Plus aria-hidden="true" className="h-4 w-4 shrink-0" />
          Save an item
        </span>
      </Button>
    ),
  },
};
export default meta;
type Story = StoryObj<typeof SavedItems>;

/**
 * Sam's own wishlist, the one they keep for their child, a birthday list and
 * a baby registry. Some items are on two lists. "Still wanted" shows first.
 */
export const Default: Story = {};

/** Everything, gifted items and things Sam already has included. */
export const All: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("radio", { name: /^All/ }));
  },
};

/** An item's Lists picker: tick the lists it should be on. */
export const ListsPicker: Story = {
  name: "Lists picker",
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Lists for Wireless noise-cancelling headphones" }));
    await screen.findByRole("dialog");
  },
};

/** Two items selected, with the bar for adding them to a list or taking them off. */
export const Selected: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("checkbox", { name: "Select Rain boots, size 8" }));
    await userEvent.click(canvas.getByRole("checkbox", { name: "Select Gingham picnic blanket" }));
    await userEvent.click(canvas.getByRole("button", { name: "Add to list…" }));
    await screen.findByRole("dialog");
  },
};

/**
 * Sam has lists but no wishlist of their own, so the tab offers to start one,
 * and Save an item starts on the first list.
 */
export const NoWishlistYet: Story = {
  name: "No wishlist yet",
  args: {
    lists: [kidsList, babyRegistry],
    items: items
      .map((i) => ({ ...i, listIds: i.listIds.filter((id) => id === "kids-list" || id === "baby-registry") }))
      .filter((i) => i.listIds.length > 0),
  },
};

/** A new account: no lists and nothing saved. */
export const Empty: Story = {
  args: { lists: [], items: [] },
};

/**
 * Sam hides what's been reserved on their wishlist, so its items look still
 * wanted (the server masks them) and a note says why.
 */
export const HidesReservations: Story = {
  name: "Hides what's been reserved",
  args: {
    lists: [{ ...myWishlist, hidesReservations: true }, kidsList, birthday, babyRegistry],
    items: items.map((i) => (i.listIds.includes("my-wishlist") && i.status === "gifted" ? { ...i, status: "wanted" } : i)),
  },
};

/** On a phone. */
export const Phone: Story = {
  globals: { viewport: { value: "mobile1" } },
};

/** The bulk bar on a phone. */
export const PhoneSelected: Story = {
  name: "Phone, selected",
  globals: { viewport: { value: "mobile1" } },
  play: Selected.play,
};

/** The placeholder while the tab loads. */
export const Loading: Story = {
  render: () => <SavedSkeleton />,
};
