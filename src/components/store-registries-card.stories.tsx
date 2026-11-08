import type { Meta, StoryObj } from "@storybook/react";
import { StoreRegistriesCard } from "./store-registries-card";
import type { RetailerRegistry } from "@/lib/retailers";

// Stands in for the server action so the story saves nothing.
const mockSave = async (_registryId: string, registries: RetailerRegistry[]) => {
  await new Promise((r) => setTimeout(r, 400));
  return { registries };
};

const meta: Meta<typeof StoreRegistriesCard> = {
  title: "Components/StoreRegistriesCard",
  component: StoreRegistriesCard,
  parameters: { layout: "padded" },
  args: {
    registryId: "demo",
    saveAction: mockSave,
  },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof StoreRegistriesCard>;

// Two stores linked, with the form to add the others.
export const WithLinkedStores: Story = {
  args: {
    initialRegistries: [
      { store: "amazon", url: "https://www.amazon.com/baby-reg/your-registry/EXAMPLE" },
      { store: "target", url: "https://www.target.com/gift-registry/gift-giver?registryId=EXAMPLE&type=BABY" },
    ],
  },
};
