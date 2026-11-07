import type { Meta, StoryObj } from "@storybook/react";

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "./card";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
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
