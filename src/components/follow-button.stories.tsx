import type { Meta, StoryObj } from "@storybook/react";
import { FollowButton, type FollowButtonState } from "./follow-button";

const mockAction = async () => {
  await new Promise((r) => setTimeout(r, 500));
  return { success: true };
};

const meta: Meta<typeof FollowButton> = {
  title: "Components/FollowButton",
  component: FollowButton,
  parameters: { layout: "centered" },
};
export default meta;
type Story = StoryObj<typeof FollowButton>;

const states: FollowButtonState[] = [
  "none",
  "pending",
  "approved",
  "signed-out",
  "blocked",
];

// Every state on one page, so one snapshot catches a change to any of them.
export const AllStates: Story = {
  render: () => (
    <div className="grid grid-cols-3 gap-x-8 gap-y-10">
      {states.map((state) => (
        <div key={state} className="flex flex-col items-center gap-2">
          <span className="text-xs font-mono text-tertiary">{state}</span>
          <FollowButton
            publicId="k7m2p9qx4t"
            name="Remi & Max"
            state={state}
            returnTo="/u/remi-max-k7m2p9qx4t"
            requestAction={mockAction}
            cancelAction={mockAction}
          />
        </div>
      ))}
    </div>
  ),
};
