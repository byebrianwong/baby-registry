import type { Meta, StoryObj } from "@storybook/react";
import { NavLinkLabel, navLinkClassName, type NavLinkVariant } from "./nav-link";

// The two top-bar sections as they appear in the header. A real click can't
// be held in the pending state in Storybook, so this sets it directly.
function TopBarLinks({ variant, clicked }: { variant: NavLinkVariant; clicked: boolean }) {
  const links = [
    { label: "My registries", current: !clicked, pending: false },
    { label: "Following", current: clicked, pending: clicked },
  ];
  return (
    <ul className={variant === "bar" ? "flex items-center gap-1" : "flex w-[375px] border-b border-secondary"}>
      {links.map((link) => (
        <li key={link.label} className={variant === "tab" ? "flex-1" : undefined}>
          <span className={navLinkClassName(variant, link.current)}>
            <NavLinkLabel label={link.label} pending={link.pending} />
          </span>
        </li>
      ))}
    </ul>
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

/** Desktop, just after clicking Following, while the next page is on its way. */
export const ClickedFollowing: Story = {
  args: { variant: "bar", clicked: true },
};

/** The phone tabs in the same moment. */
export const ClickedFollowingOnPhone: Story = {
  args: { variant: "tab", clicked: true },
};
