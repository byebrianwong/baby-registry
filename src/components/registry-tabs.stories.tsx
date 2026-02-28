import type { Meta, StoryObj } from "@storybook/react";
import { RegistryTabs } from "./registry-tabs";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Mail, MessageSquare, DollarSign } from "lucide-react";

const meta: Meta<typeof RegistryTabs> = {
  title: "Components/RegistryTabs",
  component: RegistryTabs,
  parameters: {
    layout: "padded",
  },
};
export default meta;
type Story = StoryObj<typeof RegistryTabs>;

const samplePurchases = [
  {
    id: "1",
    buyer_name: "Grandma Rose",
    buyer_email: "rose@example.com",
    item_title: "Newton Crib Mattress",
    quantity: 1,
    amount: null,
    cash_fund_id: null,
    message: "Can't wait to meet the little one!",
    created_at: "2026-02-10T14:30:00Z",
  },
  {
    id: "2",
    buyer_name: "Uncle Dave",
    buyer_email: "dave@example.com",
    item_title: "Ergobaby Omni 360 Carrier",
    quantity: 1,
    amount: null,
    cash_fund_id: null,
    message: null,
    created_at: "2026-02-15T16:25:00Z",
  },
  {
    id: "3",
    buyer_name: "Grandpa Tom",
    buyer_email: "tom@example.com",
    item_title: "College Savings",
    quantity: 1,
    amount: 250,
    cash_fund_id: "fund-2",
    message: "Start 'em young! Love you all.",
    created_at: "2026-02-19T14:15:00Z",
  },
];

export const WithData: Story = {
  args: {
    totalItems: 32,
    purchaseCount: 3,
    itemsContent: (
      <div className="text-tertiary text-center py-8">
        [Items grid would render here]
      </div>
    ),
    purchasesContent: (
      <div className="space-y-3">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Gift Activity</h2>
          <p className="text-sm text-tertiary">
            See who has reserved items and contributed to funds
          </p>
        </div>
        {samplePurchases.map((purchase) => (
          <Card key={purchase.id}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{purchase.buyer_name}</span>
                <Badge
                  variant={purchase.cash_fund_id ? "default" : "secondary"}
                  className="text-xs"
                >
                  {purchase.cash_fund_id ? "Contribution" : "Reserved"}
                </Badge>
              </div>
              <p className="text-sm mt-1">
                {purchase.cash_fund_id ? (
                  <>
                    <DollarSign className="inline h-3 w-3 mr-1" />
                    Contributed <span className="font-medium">${purchase.amount}</span> to{" "}
                    <span className="font-medium">{purchase.item_title}</span>
                  </>
                ) : (
                  <>
                    Reserved <span className="font-medium">{purchase.item_title}</span>
                  </>
                )}
              </p>
              <div className="flex items-center gap-3 mt-1 text-xs text-tertiary">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {purchase.buyer_email}
                </span>
                <span>
                  {new Date(purchase.created_at).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </div>
              {purchase.message && (
                <p className="mt-2 text-sm text-tertiary flex items-start gap-1">
                  <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                  &ldquo;{purchase.message}&rdquo;
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    ),
  },
};

export const Empty: Story = {
  args: {
    totalItems: 0,
    purchaseCount: 0,
    itemsContent: (
      <div className="text-tertiary text-center py-12">
        No items yet. Add items manually or browse the checklist.
      </div>
    ),
    purchasesContent: (
      <div className="text-tertiary text-center py-12">
        No gifts reserved yet. Share your registry link to get started!
      </div>
    ),
  },
};
