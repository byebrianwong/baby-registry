import type { Meta, StoryObj } from "@storybook/react";
import { BirthdaysComingUp } from "./birthdays-coming-up";

const meta: Meta<typeof BirthdaysComingUp> = {
  title: "Components/BirthdaysComingUp",
  component: BirthdaysComingUp,
  decorators: [(Story) => <div className="mx-auto max-w-2xl p-4"><Story /></div>],
  args: {
    today: "2026-03-01",
    birthdays: [
      {
        key: "glinda",
        name: "Glinda Upland",
        date: "2026-03-03",
        href: "/r/glindas-wishlist-7k2m",
        linkTo: "list",
      },
      {
        key: "toto",
        name: "Toto",
        date: "2026-03-01",
        href: "/r/totos-wishlist-4n8p",
        linkTo: "list",
        parentName: "Dorothy Gale",
      },
      {
        key: "oz",
        name: "Oz Diggs",
        date: "2026-03-24",
        href: "/u/oz-diggs-z5t7q3mc9k",
        linkTo: "profile",
      },
    ],
  },
};
export default meta;
type Story = StoryObj<typeof BirthdaysComingUp>;

// Soonest first. Today's and tomorrow's stand out.
export const ThreeComingUp: Story = {};

// A phone-sized screen, with a long name.
export const Mobile: Story = {
  args: {
    birthdays: [
      {
        key: "long",
        name: "Elphaba Thropp of the Vinkus and the Emerald City",
        date: "2026-03-02",
        href: "/u/elphaba-thropp-e2h6w9pa4r",
        linkTo: "profile",
      },
    ],
  },
  globals: { viewport: { value: "mobile1" } },
};
