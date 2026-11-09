import type { Meta, StoryObj } from "@storybook/react";
import { RegistryAvatar } from "./registry-avatar";

const meta: Meta<typeof RegistryAvatar> = {
  title: "Components/RegistryAvatar",
  component: RegistryAvatar,
  parameters: { layout: "centered" },
};
export default meta;
type Story = StoryObj<typeof RegistryAvatar>;

// Two people and no photo: one initial each, joined with "+".
export const Couple: Story = {
  args: { names: "Remi & Max" },
};

// One person and no photo: their first and last initials.
export const OnePerson: Story = {
  args: { names: "Alex Kim" },
};

// A photo wins over the names.
export const Photo: Story = {
  args: {
    names: "Remi & Max",
    photoUrl: "https://images.unsplash.com/photo-1519689680058-324335c77eba?w=300&h=300&fit=crop",
  },
};
