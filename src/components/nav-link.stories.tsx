import type { Meta, StoryObj } from "@storybook/react";
import { NavLinkLabel } from "./nav-link";

// The two top-bar links, side by side as they appear in the header.
function TopBarLinks({ clicked }: { clicked: boolean }) {
  return (
    <nav className="flex items-center gap-4 text-sm">
      <NavLinkLabel label="Dashboard" current={!clicked} pending={false} />
      <NavLinkLabel label="Following" current={clicked} pending={clicked} />
    </nav>
  );
}

const meta: Meta<typeof TopBarLinks> = {
  title: "Components/NavLink",
  component: TopBarLinks,
  parameters: {
    layout: "padded",
  },
};
export default meta;
type Story = StoryObj<typeof TopBarLinks>;

/** On the dashboard, before any click. */
export const OnDashboard: Story = {
  args: { clicked: false },
};

/** Just after clicking Following, while the next page is on its way. */
export const ClickedFollowing: Story = {
  args: { clicked: true },
};
