import type { Meta, StoryObj } from "@storybook/react";
import { LandingPage } from "./landing-page";
import { NavBar } from "./nav-bar";

const meta: Meta<typeof LandingPage> = {
  title: "Pages/Landing Page",
  component: LandingPage,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
    },
  },
  args: {
    signedIn: false,
    nav: <NavBar account={null} />,
  },
};
export default meta;
type Story = StoryObj<typeof LandingPage>;

export const Default: Story = {};

// Signed-in people get one button back to their dashboard instead of the
// sign-up and demo buttons.
export const SignedIn: Story = {
  args: {
    signedIn: true,
    nav: (
      <NavBar
        account={{
          name: "Remi & Max",
          profilePath: "/u/remi-max-k7m2p9qx4t",
          email: "remi@example.com",
          followRequestCount: 0,
        }}
      />
    ),
  },
};
