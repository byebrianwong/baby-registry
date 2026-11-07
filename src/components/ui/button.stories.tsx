import type { Meta, StoryObj } from "@storybook/react";
import { Plus } from "lucide-react";

import { Button } from "./button";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Button>;

const variants = [
  "default",
  "secondary",
  "outline",
  "destructive",
  "destructive-outline",
  "ghost",
  "link",
] as const;
const sizes = ["xs", "sm", "default", "lg"] as const;
const iconSizes = ["icon-xs", "icon-sm", "icon", "icon-lg"] as const;

// Every variant and size on one page, so one snapshot catches a change to any of them.
export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        {variants.map((variant) => (
          <Button key={variant} variant={variant}>
            {variant}
          </Button>
        ))}
        <Button disabled>disabled</Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {sizes.map((size) => (
          <Button key={size} size={size}>
            <span className="inline-flex items-center gap-1.5">
              <Plus className="h-4 w-4 shrink-0" />
              {size}
            </span>
          </Button>
        ))}
        {iconSizes.map((size) => (
          <Button key={size} size={size} aria-label={`Add item (${size})`}>
            <Plus className="h-4 w-4" />
          </Button>
        ))}
      </div>
    </div>
  ),
};
