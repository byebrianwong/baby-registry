import type { Meta, StoryObj } from "@storybook/react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./card";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Basic: Story = {
  args: {
    children: (
      <CardContent>
        <p>A simple card with some content inside.</p>
      </CardContent>
    ),
  },
};

export const WithHeader: Story = {
  args: {
    children: (
      <>
        <CardHeader>
          <CardTitle>Baby Registry</CardTitle>
          <CardDescription>
            Track all the items you need for your new arrival.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            Your registry has been created. Start adding items to share with
            friends and family.
          </p>
        </CardContent>
      </>
    ),
  },
};

export const StatCard: Story = {
  name: "Stat Card",
  args: {
    children: (
      <>
        <CardHeader>
          <CardTitle>Registry Progress</CardTitle>
          <CardDescription>Items fulfilled so far</CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span style={{ fontSize: "2rem", fontWeight: 700 }}>12 / 24</span>
            <span style={{ fontSize: "0.875rem", color: "var(--muted-foreground)" }}>
              50% complete
            </span>
          </div>
        </CardContent>
      </>
    ),
  },
};
