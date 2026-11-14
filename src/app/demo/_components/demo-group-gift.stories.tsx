import type { Meta, StoryObj } from "@storybook/react";
import { DEMO_STROLLER_GROUP_GIFT_TOKEN } from "@/lib/demo-group-gifts";
import { groupGiftPath } from "@/lib/group-gifts";
import { DemoGroupGift } from "./demo-group-gift";
import { demoPageParameters, withDemoToday } from "../story-today";

const meta: Meta<typeof DemoGroupGift> = {
  title: "Pages/Demo Group Gift",
  component: DemoGroupGift,
  parameters: demoPageParameters(groupGiftPath(DEMO_STROLLER_GROUP_GIFT_TOKEN, "/demo")),
  decorators: [withDemoToday],
  args: { token: DEMO_STROLLER_GROUP_GIFT_TOKEN },
};
export default meta;
type Story = StoryObj<typeof DemoGroupGift>;

// Shower guests going in on the stroller, as a guest opening Oz's link: the
// total so far, who's in, and the form to chip in without an account.
export const AsAGuest: Story = { args: { as: "visitor" } };

// The same group gift as Oz, who started it: everyone's amounts and emails,
// Paid ticks, his own share, and the buttons to finish it.
export const AsTheOrganizer: Story = { args: { as: "organizer" } };
