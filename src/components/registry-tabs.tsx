"use client";

import { type Key } from "react";
import { Tabs, TabList, Tab, TabPanel } from "@/components/base/tabs/tabs";

interface RegistryTabsProps {
  totalItems: number;
  purchaseCount: number;
  suggestionCount: number;
  itemsContent: React.ReactNode;
  purchasesContent: React.ReactNode;
  suggestionsContent: React.ReactNode;
}

const tabs = [
  { id: "items", label: "Items" },
  { id: "purchases", label: "Gift Activity" },
  { id: "suggestions", label: "Suggestions Inbox" },
] as const;

export function RegistryTabs({
  totalItems,
  purchaseCount,
  suggestionCount,
  itemsContent,
  purchasesContent,
  suggestionsContent,
}: RegistryTabsProps) {
  const counts: Record<string, number> = {
    items: totalItems,
    purchases: purchaseCount,
    suggestions: suggestionCount,
  };

  return (
    <Tabs defaultSelectedKey="items" className="mb-6">
      <TabList
        type="button-minimal"
        size="sm"
        className="w-fit"
        items={tabs.map((t) => ({
          id: t.id,
          children: t.label,
          badge: counts[t.id],
        }))}
      >
        {(item) => (
          <Tab key={item.id} id={item.id} badge={item.badge}>
            {item.children}
          </Tab>
        )}
      </TabList>
      <TabPanel id="items" className="pt-6">
        {itemsContent}
      </TabPanel>
      <TabPanel id="purchases" className="pt-6">
        {purchasesContent}
      </TabPanel>
      <TabPanel id="suggestions" className="pt-6">
        {suggestionsContent}
      </TabPanel>
    </Tabs>
  );
}
