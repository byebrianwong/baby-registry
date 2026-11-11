import type { Meta, StoryObj } from "@storybook/react";
import { RegistryEventsBanner } from "./registry-events-banner";

const meta: Meta<typeof RegistryEventsBanner> = {
  title: "Components/RegistryEventsBanner",
  component: RegistryEventsBanner,
  decorators: [(Story) => <div className="mx-auto max-w-4xl p-4"><Story /></div>],
  args: { registryId: "reg-1" },
};
export default meta;
type Story = StoryObj<typeof RegistryEventsBanner>;

// Every state on one page, so one snapshot catches a change to any of them.
export const AllStates: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      <RegistryEventsBanner {...args} events={[]} />
      <RegistryEventsBanner
        {...args}
        events={[{ id: "e1", title: "Monday Night", event_date: "2026-11-16", event_type: "other" }]}
      />
      <RegistryEventsBanner
        {...args}
        events={[
          { id: "e2", title: "Dana's Baby Shower", event_date: "2026-12-05", event_type: "baby_shower" },
          { id: "e3", title: "Sip and See", event_date: null, event_type: "other" },
        ]}
      />
      {/* One event the owner hosts, and one a coworker hosts that links this
          registry. The owner can't manage the second, so its link opens the
          guest page and it has an Unlink button. */}
      <RegistryEventsBanner
        {...args}
        events={[
          { id: "e4", title: "Dana's Baby Shower", event_date: "2026-12-05", event_type: "baby_shower" },
          {
            id: "e5",
            slug: "office-baby-shower-x7c2",
            title: "Office Baby Shower",
            event_date: "2026-11-20",
            event_type: "baby_shower",
            canManage: false,
          },
        ]}
      />
    </div>
  ),
};
