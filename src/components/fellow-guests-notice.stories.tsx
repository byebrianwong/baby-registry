import type { Meta, StoryObj } from "@storybook/react";
import { FellowGuestsNotice } from "./fellow-guests-notice";

// On a guest's wish list, for another guest who opened it from an
// everyone-gives-everyone invitation (src/app/r/[slug]/page.tsx).

const meta: Meta<typeof FellowGuestsNotice> = {
  title: "Components/FellowGuestsNotice",
  component: FellowGuestsNotice,
  parameters: { layout: "padded" },
  args: { eventTitle: "Holiday Gift Swap", eventHref: "#", ownerName: "Elphaba Thropp" },
  decorators: [
    (Story) => (
      <div className="max-w-3xl">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof FellowGuestsNotice>;

/** On Elphaba's list. */
export const OnAGuestsList: Story = {};

/** On a list the event links that names nobody. */
export const NoOwnerName: Story = { args: { ownerName: null } };

export const Phone: Story = { globals: { viewport: { value: "mobile1" } } };
