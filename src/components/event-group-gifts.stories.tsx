import type { Meta, StoryObj } from "@storybook/react";
import { EventGroupGifts } from "./event-group-gifts";

const meta: Meta<typeof EventGroupGifts> = {
  title: "Components/EventGroupGifts",
  component: EventGroupGifts,
  parameters: { layout: "padded", nextjs: { appDirectory: true } },
  args: {
    gifts: [
      {
        token: "story-group-gift-token-0000",
        status: "open",
        itemTitle: "Hot air balloon ride for two",
        imageUrl: null,
        recipientName: "Dorothy",
        organizerName: "Uncle Oz",
        goalAmount: 240,
        pledged: 145,
        pledgeCount: 3,
      },
      {
        token: "story-group-gift-token-1111",
        status: "bought",
        itemTitle: "Ruby slippers, size 7",
        imageUrl: null,
        recipientName: "Dorothy",
        organizerName: "Glinda Good",
        goalAmount: null,
        pledged: 60,
        pledgeCount: 1,
      },
    ],
  },
};
export default meta;
type Story = StoryObj<typeof EventGroupGifts>;

/** On a guest's invitation: one collecting, one already bought. On a phone. */
export const OnAPhone: Story = {
  globals: { viewport: { value: "mobile1" } },
};
