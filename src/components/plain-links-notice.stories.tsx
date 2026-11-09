import type { Meta, StoryObj } from "@storybook/react";
import { PlainLinksNotice } from "./plain-links-notice";

const meta: Meta<typeof PlainLinksNotice> = {
  title: "Components/PlainLinksNotice",
  component: PlainLinksNotice,
  parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj<typeof PlainLinksNotice>;

// Both wordings in one story, to keep Chromatic snapshots down: two items
// with plain Target links, and one with a plain Amazon link.
export const TwoStores: Story = {
  args: {
    registryId: "demo",
    hideAction: async () => ({}),
    groups: [
      {
        storeId: "amazon",
        items: [{ id: "a1", title: "Hatch Rest Sound Machine and Night Light" }],
      },
      {
        storeId: "target",
        items: [
          { id: "t1", title: "Pigeon Natural Feel Baby Bottle, 5 oz, 2 pack" },
          { id: "t2", title: "Halo SleepSack Swaddle, Cotton, Newborn" },
        ],
      },
    ],
  },
  render: (args) => (
    <div className="max-w-2xl">
      <PlainLinksNotice {...args} />
    </div>
  ),
};
