import type { Meta, StoryObj } from "@storybook/react";
import { StoreLinkNotice } from "./store-link-notice";
import type { RetailerRegistry } from "@/lib/retailers";

const LINKED: RetailerRegistry[] = [
  { store: "amazon", url: "https://www.amazon.com/baby-reg/your-registry/EXAMPLE" },
  { store: "target", url: "https://www.target.com/gift-registry/gift-giver?registryId=EXAMPLE&type=BABY" },
];

const meta: Meta<typeof StoreLinkNotice> = {
  title: "Components/StoreLinkNotice",
  component: StoreLinkNotice,
  parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj<typeof StoreLinkNotice>;

// Every state in one story, to keep Chromatic snapshots down. The owner has
// linked Amazon and Target, and other items already use Walmart registry
// links. The links follow each store's real link shapes, with made-up ids.
export const AllStates: Story = {
  render: () => (
    <div className="flex max-w-md flex-col gap-6">
      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-tertiary">Registry item link</h3>
        <StoreLinkNotice
          url="https://www.amazon.com/dp/B0EXAMPLE?colid=EXAMPLE&coliid=EXAMPLE&psc=1"
          registryId="demo"
          linkedRegistries={LINKED}
          storesWithRegistryLinks={["walmart"]}
        />
      </section>
      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-tertiary">Registry item link from a store not linked yet</h3>
        <StoreLinkNotice
          url="https://www.walmart.com/ip/seort/000000?listRegistryId=EXAMPLE&listRegistryType=BR"
          registryId="demo"
          linkedRegistries={LINKED}
          storesWithRegistryLinks={["walmart"]}
        />
      </section>
      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-tertiary">Plain product link from a linked store</h3>
        <StoreLinkNotice
          url="https://www.target.com/p/hatch-rest-sound-machine/-/A-00000000?preselect=00000000"
          registryId="demo"
          linkedRegistries={LINKED}
          storesWithRegistryLinks={["walmart"]}
        />
      </section>
      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-tertiary">
          Plain product link, store not linked but other items use its registry links
        </h3>
        <StoreLinkNotice
          url="https://www.walmart.com/ip/seort/000000"
          registryId="demo"
          linkedRegistries={LINKED}
          storesWithRegistryLinks={["walmart"]}
        />
      </section>
      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-tertiary">Can&apos;t tell from the link (a short link)</h3>
        <StoreLinkNotice
          url="https://a.co/d/EXAMPLE"
          registryId="demo"
          linkedRegistries={LINKED}
          storesWithRegistryLinks={["walmart"]}
        />
      </section>
      <section className="space-y-2">
        <h3 className="text-xs font-semibold text-tertiary">No sign of a registry at this store</h3>
        <StoreLinkNotice
          url="https://www.potterybarnkids.com/products/000000/"
          registryId="demo"
          linkedRegistries={LINKED}
          storesWithRegistryLinks={["walmart"]}
        />
      </section>
    </div>
  ),
};
