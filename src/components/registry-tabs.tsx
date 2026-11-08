"use client";

import { Tabs, TabList, Tab, TabPanel } from "@/components/base/tabs/tabs";

interface RegistryTabsProps {
  totalItems: number;
  purchaseCount: number;
  suggestionCount: number;
  itemsContent: React.ReactNode;
  purchasesContent: React.ReactNode;
  suggestionsContent: React.ReactNode;
  /** The Store perks tab, for baby registries with store registries. */
  perksContent?: React.ReactNode;
  /** Perks ready to claim, shown on the Store perks tab. */
  perksCount?: number;
  /** The tab to open on, from the page's ?tab= param. */
  defaultTab?: string;
}

const tabs = [
  { id: "items", label: "Items" },
  { id: "purchases", label: "Gift Activity" },
  { id: "suggestions", label: "Suggestions Inbox" },
  { id: "perks", label: "Store perks" },
] as const;

export function RegistryTabs({
  totalItems,
  purchaseCount,
  suggestionCount,
  itemsContent,
  purchasesContent,
  suggestionsContent,
  perksContent,
  perksCount,
  defaultTab,
}: RegistryTabsProps) {
  const counts: Record<string, number | undefined> = {
    items: totalItems,
    purchases: purchaseCount,
    suggestions: suggestionCount,
    perks: perksCount || undefined,
  };
  const shown = tabs.filter((t) => t.id !== "perks" || perksContent);
  const selected = shown.some((t) => t.id === defaultTab) ? defaultTab! : "items";

  return (
    // Keyed by the starting tab, so a link to another ?tab= opens it.
    <Tabs key={selected} defaultSelectedKey={selected} className="mb-6">
      <TabList
        type="button-minimal"
        size="sm"
        className="w-fit"
        items={shown.map((t) => ({
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
      {perksContent && (
        <TabPanel id="perks" className="pt-6">
          {perksContent}
        </TabPanel>
      )}
    </Tabs>
  );
}
