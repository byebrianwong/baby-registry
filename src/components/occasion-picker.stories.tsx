import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import type { PersonalEventType } from "@/lib/types";
import { OccasionPicker } from "./occasion-picker";

function Controlled({
  initial,
  defaultOpen,
}: {
  initial: PersonalEventType | "";
  defaultOpen?: boolean;
}) {
  const [value, setValue] = useState<PersonalEventType | "">(initial);
  return (
    <OccasionPicker
      value={value}
      onChange={setValue}
      defaultOpen={defaultOpen}
      hint="Changes the wording on your registry to fit the occasion. You can skip this."
    />
  );
}

const meta: Meta<typeof Controlled> = {
  title: "Components/OccasionPicker",
  component: Controlled,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      // Leaves room below the field so the open list fits in the snapshot.
      <div style={{ maxWidth: 420, minHeight: 640 }}>
        <Story />
      </div>
    ),
  ],
  args: { initial: "" },
};
export default meta;
type Story = StoryObj<typeof Controlled>;

export const NoOccasion: Story = {};

export const Birthday: Story = {
  args: { initial: "birthday" },
};

export const Open: Story = {
  args: { initial: "wedding", defaultOpen: true },
};
