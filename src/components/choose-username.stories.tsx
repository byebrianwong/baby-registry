import type { Meta, StoryObj } from "@storybook/react";
import { ChooseUsername } from "./choose-username";

const mockSave = async () => ({ success: true, username: "remi-max" });
const mockTaken = async () => ({ error: "That username is taken." });

const meta: Meta<typeof ChooseUsername> = {
  title: "Components/ChooseUsername",
  component: ChooseUsername,
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true },
  },
  args: {
    fullName: "Remi & Max",
    next: "/dashboard",
    saveAction: mockSave as never,
  },
};
export default meta;
type Story = StoryObj<typeof ChooseUsername>;

/** Straight after sign-up, with a username suggested from the name. */
export const JustSignedUp: Story = {};

/** After pressing Claim username when the suggestion is taken. */
export const UsernameTaken: Story = {
  args: { saveAction: mockTaken as never },
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Claim username" }));
    await canvas.findByText("That username is taken.");
  },
};
