import type { Meta, StoryObj } from "@storybook/react";
import { ReservationPrivacyCard } from "./reservation-privacy-card";

const save = async () => ({ success: true as const });

const meta: Meta<typeof ReservationPrivacyCard> = {
  title: "Components/ReservationPrivacyCard",
  component: ReservationPrivacyCard,
  decorators: [(Story) => <div className="mx-auto max-w-2xl p-4"><Story /></div>],
  args: { registryId: "reg-1", saveAction: save },
};
export default meta;
type Story = StoryObj<typeof ReservationPrivacyCard>;

// Every state on one page, so one snapshot catches a change to any of them.
export const AllStates: Story = {
  render: (args) => (
    <div className="flex flex-col gap-4">
      {/* A personal wishlist that shows everything, as new lists do. */}
      <ReservationPrivacyCard {...args} isOwner isPersonal privacy={{}} />
      {/* Regibee turned hiding on when the owner added the list to a gift exchange. */}
      <ReservationPrivacyCard
        {...args}
        isOwner
        isPersonal
        privacy={{ hide_reservations: true, hide_reservations_source: "exchange" }}
      />
      {/* A list kept for a child: hiding can't be turned on. */}
      <ReservationPrivacyCard
        {...args}
        isOwner
        isPersonal
        privacy={{ hide_reservations: false, hide_reservations_source: "owner", for_child: true }}
      />
      {/* A baby registry has no "for my child" choice. */}
      <ReservationPrivacyCard {...args} isOwner isPersonal={false} privacy={{}} />
      {/* What a co-manager sees when the owner hides reservations. */}
      <ReservationPrivacyCard
        {...args}
        isOwner={false}
        isPersonal
        privacy={{ hide_reservations: true, hide_reservations_source: "owner" }}
      />
    </div>
  ),
};
