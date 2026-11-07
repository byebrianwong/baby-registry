import type { Meta, StoryObj } from "@storybook/react";
import { StoreLinkNotice } from "./store-link-notice";
import type { RetailerRegistry } from "@/lib/retailers";

const LINKED: RetailerRegistry[] = [
  { store: "amazon", url: "https://www.amazon.com/baby-reg/example" },
  { store: "target", url: "https://www.target.com/gift-registry/example" },
];

const meta: Meta<typeof StoreLinkNotice> = {
  title: "Components/StoreLinkNotice",
  component: StoreLinkNotice,
  parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj<typeof StoreLinkNotice>;

// All four states in one story, to keep Chromatic snapshots down.
export const AllStates: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-6">
      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-tertiary">Link names a registry</h3>
        <StoreLinkNotice
          url="https://www.amazon.com/dp/B0EXAMPLE?colid=EXAMPLE&coliid=EXAMPLE"
          registryId="demo"
          linkedRegistries={LINKED}
        />
      </section>
      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-tertiary">Bare product link from a linked store</h3>
        <StoreLinkNotice
          url="https://www.target.com/p/hatch-rest-sound-machine/-/A-00000000"
          registryId="demo"
          linkedRegistries={LINKED}
        />
      </section>
      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-tertiary">Can&apos;t tell from the link</h3>
        <StoreLinkNotice
          url="https://www.amazon.com/dp/B0EXAMPLE?th=1&psc=1"
          registryId="demo"
          linkedRegistries={LINKED}
        />
      </section>
      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-tertiary">Store not linked yet</h3>
        <StoreLinkNotice
          url="https://www.walmart.com/ip/baby-bath-support/000000"
          registryId="demo"
          linkedRegistries={LINKED}
        />
      </section>
    </div>
  ),
};
