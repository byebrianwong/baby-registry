import type { Meta, StoryObj } from "@storybook/react";
import { ExtensionConnectCard } from "./extension-connect";

const meta: Meta<typeof ExtensionConnectCard> = {
  title: "Pages/ExtensionConnect",
  component: ExtensionConnectCard,
  parameters: { layout: "fullscreen" },
  args: { name: "Sam Rivera" },
};
export default meta;
type Story = StoryObj<typeof ExtensionConnectCard>;

// The extension answered, so the Connect button works.
export const Ready: Story = { args: { status: "ready" } };

// No extension answered: Connect stays disabled.
export const NotInstalled: Story = { args: { status: "missing" } };

export const Failed: Story = {
  args: { status: "error", error: "The extension didn't answer. Reload this page and try again." },
};

export const Connected: Story = { args: { status: "connected" } };
