import type { Meta, StoryObj } from "@storybook/react";
import { ReservationsHiddenNotice } from "./reservations-hidden-notice";

const meta: Meta<typeof ReservationsHiddenNotice> = {
  title: "Components/ReservationsHiddenNotice",
  component: ReservationsHiddenNotice,
  decorators: [(Story) => <div className="mx-auto max-w-4xl p-4"><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof ReservationsHiddenNotice>;

// Every state on one page, so one snapshot catches a change to any of them.
export const AllStates: Story = {
  render: () => (
    <div className="flex flex-col gap-4">
      {/* The owner turned it on in settings. */}
      <ReservationsHiddenNotice settingsHref="/dashboard/registry/reg-1/settings" />
      {/* Regibee turned it on when the owner added the list to a gift exchange. */}
      <ReservationsHiddenNotice settingsHref="/dashboard/registry/reg-1/settings" turnedOnByExchange />
      {/* On the public page, which has no settings link. */}
      <ReservationsHiddenNotice />
    </div>
  ),
};
