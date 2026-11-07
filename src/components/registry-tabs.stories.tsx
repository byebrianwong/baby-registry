import type { Meta, StoryObj } from "@storybook/react";
import { RegistryTabs } from "./registry-tabs";

const meta: Meta<typeof RegistryTabs> = {
  title: "Components/RegistryTabs",
  component: RegistryTabs,
  parameters: {
    layout: "padded",
  },
};
export default meta;
type Story = StoryObj<typeof RegistryTabs>;

// The tabs and their counts. The dashboard passes in what each tab holds, so
// placeholders stand in for it here.
export const WithData: Story = {
  args: {
    totalItems: 32,
    purchaseCount: 3,
    suggestionCount: 1,
    itemsContent: (
      <div className="text-tertiary text-center py-8">
        [Items grid would render here]
      </div>
    ),
    purchasesContent: (
      <div className="text-tertiary text-center py-8">
        [Gift activity would render here]
      </div>
    ),
    suggestionsContent: (
      <div className="text-tertiary text-center py-8">
        [Suggestions would render here]
      </div>
    ),
  },
};
