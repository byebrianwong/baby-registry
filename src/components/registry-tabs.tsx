"use client";

import { useState } from "react";

interface RegistryTabsProps {
  totalItems: number;
  purchaseCount: number;
  itemsContent: React.ReactNode;
  purchasesContent: React.ReactNode;
}

export function RegistryTabs({
  totalItems,
  purchaseCount,
  itemsContent,
  purchasesContent,
}: RegistryTabsProps) {
  const [activeTab, setActiveTab] = useState<"items" | "purchases">("items");

  return (
    <>
      <div className="flex items-center gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab("items")}
          className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "items"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Items ({totalItems})
        </button>
        <button
          onClick={() => setActiveTab("purchases")}
          className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "purchases"
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Gift Activity ({purchaseCount})
        </button>
      </div>

      {activeTab === "items" ? itemsContent : purchasesContent}
    </>
  );
}
