import type { Meta, StoryObj } from "@storybook/react";
import { GroupGiftSurprise } from "./group-gift-surprise";

const meta: Meta<typeof GroupGiftSurprise> = {
  title: "Components/GroupGiftSurprise",
  component: GroupGiftSurprise,
  parameters: { layout: "padded", nextjs: { appDirectory: true } },
};
export default meta;
type Story = StoryObj<typeof GroupGiftSurprise>;

/** A list's owner who opens a group gift on their own list sees nothing about it. */
export const Default: Story = {
  args: { listSlug: "dorothy-40th" },
};
