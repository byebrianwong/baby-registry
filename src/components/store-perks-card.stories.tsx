import type { Meta, StoryObj } from "@storybook/react";
import { StorePerksCard } from "./store-perks-card";
import { buildStorePerks, type PerkItem, type PerkPurchase } from "@/lib/store-perks";
import type { RetailerRegistry } from "@/lib/retailers";

const meta: Meta<typeof StorePerksCard> = {
  title: "Components/StorePerksCard",
  component: StorePerksCard,
  parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj<typeof StorePerksCard>;

// Each store's real link shapes, with made-up ids.
const amazon = (n: number) => `https://www.amazon.com/dp/B0EXAMPLE${n}?colid=EXAMPLE&coliid=EXAMPLE${n}&psc=1`;
const target = (n: number) =>
  `https://www.target.com/p/item-${n}/-/A-0000000${n}?registryId=EXAMPLE&itemLineNum=${n}`;
const walmart = "https://www.walmart.com/ip/seort/000000?listRegistryId=EXAMPLE&listRegistryType=BR";
const babylist = "https://www.babylist.com/gp/example/0000/0000";

const items: PerkItem[] = [
  { id: "a1", external_url: amazon(1), is_parent_purchased: false },
  { id: "a2", external_url: amazon(2), is_parent_purchased: false },
  { id: "a3", external_url: amazon(3), is_parent_purchased: false },
  { id: "t1", external_url: target(1), is_parent_purchased: false },
  { id: "t2", external_url: target(2), is_parent_purchased: false },
  { id: "w1", external_url: walmart, is_parent_purchased: false },
  { id: "b1", external_url: babylist, is_parent_purchased: false },
];

const purchases: PerkPurchase[] = [
  { registry_item_id: "a1", status: "reserved" },
  { registry_item_id: "t1", status: "reserved" },
  { registry_item_id: "t2", status: "cancelled" },
];

const linkedRegistries: RetailerRegistry[] = [
  { store: "amazon", url: "https://www.amazon.com/baby-reg/your-registry/EXAMPLE" },
  { store: "target", url: "https://www.target.com/gift-registry/gift-giver?registryId=EXAMPLE&type=BABY" },
  { store: "babylist", url: "https://www.babylist.com/list/example" },
];

// Every state in one story, to keep Chromatic snapshots down. Today is two
// days into the 60-day window before the due date, so Amazon's and Babylist's
// completion discounts are open and Target's opens soon. Amazon's first gift
// unlocked its welcome box, Target's kit is ready from the start, the owner
// already asked for Walmart's, and Babylist's waits for a first gift. Walmart
// isn't linked, so it offers to link it.
export const AllStates: Story = {
  args: {
    registryId: "demo",
    emails: true,
    hasDueDate: true,
    saveAction: async () => ({}),
    rows: buildStorePerks({
      items,
      purchases,
      linkedRegistries,
      dueDate: "2027-01-20",
      today: "2026-11-23",
      state: { welcomeBoxDone: ["walmart"], emails: true, sent: [] },
    }),
  },
  render: (args) => (
    <div className="max-w-xl">
      <StorePerksCard {...args} />
    </div>
  ),
};
