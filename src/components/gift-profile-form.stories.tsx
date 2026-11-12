import type { Meta, StoryObj } from "@storybook/react";
import { GiftProfileForm } from "./gift-profile-form";

const mockSave = async () => {
  await new Promise((r) => setTimeout(r, 500));
  return { success: true };
};

const meta: Meta<typeof GiftProfileForm> = {
  title: "Components/GiftProfileForm",
  component: GiftProfileForm,
  args: { onSave: mockSave },
  decorators: [
    (Story) => (
      <div className="mx-auto max-w-xl p-4">
        <Story />
      </div>
    ),
  ],
};
export default meta;
type Story = StoryObj<typeof GiftProfileForm>;

// Nothing filled in yet.
export const Empty: Story = {
  args: { initial: {} },
};

// Glinda's profile, with every field filled in.
export const Filled: Story = {
  args: {
    initial: {
      birthday: { month: 3, day: 3 },
      sizes: { tops: "M", bottoms: "30 x 32", shoes: "8.5", other: "Ring 6" },
      colors: "Soft pink, silver, anything sparkly",
      likes: ["Bubbles", "Tea", "Gardening", "Poetry", "Board games"],
      skip: ["Candles", "Mugs"],
      notes: "Trying to own less, so experiences are always welcome.",
    },
  },
};

// On the settings page of a list kept for a child: the labels name Toto.
export const ForAChild: Story = {
  args: {
    child: { name: "Toto" },
    initial: {
      birthday: { month: 11, day: 20 },
      sizes: { tops: "4T", shoes: "Toddler 9" },
      likes: ["Dinosaurs", "Picture books"],
      skip: ["Anything with small parts"],
    },
  },
};

// A phone-sized screen.
export const Mobile: Story = {
  ...Filled,
  globals: { viewport: { value: "mobile1" } },
};
