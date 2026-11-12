import type { Meta, StoryObj } from "@storybook/react";
import { BirthdayEmailsSetting } from "./birthday-emails-setting";

const meta: Meta<typeof BirthdayEmailsSetting> = {
  title: "Components/BirthdayEmailsSetting",
  component: BirthdayEmailsSetting,
  decorators: [(Story) => <div className="mx-auto max-w-xl p-4"><Story /></div>],
  args: {
    action: async () => {
      await new Promise((r) => setTimeout(r, 300));
      return { success: true };
    },
  },
};
export default meta;
type Story = StoryObj<typeof BirthdayEmailsSetting>;

// Everyone starts with reminders on.
export const On: Story = { args: { initial: true } };

// Saving failed, so the switch goes back and says why.
export const SaveFails: Story = {
  args: {
    initial: false,
    action: async () => ({ error: "We couldn't save that. Try again in a moment." }),
  },
};
