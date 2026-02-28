"use client";

import { useState } from "react";

interface RegistryTabsProps {
  totalItems: number;
  purchaseCount: number;
  suggestionCount: number;
  itemsContent: React.ReactNode;
  purchasesContent: React.ReactNode;
  suggestionsContent: React.ReactNode;
}

export function RegistryTabs({
  totalItems,
  purchaseCount,
  suggestionCount,
  itemsContent,
  purchasesContent,
  suggestionsContent,
}: RegistryTabsProps) {
  const [activeTab, setActiveTab] = useState<"items" | "purchases" | "suggestions">("items");

  return (
    <>
      <div className="flex items-center gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab("items")}
          className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "items"
              ? "border-brand-600 text-primary"
              : "border-transparent text-tertiary hover:text-primary"
          }`}
        >
          Items ({totalItems})
        </button>
        <button
          onClick={() => setActiveTab("purchases")}
          className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "purchases"
              ? "border-brand-600 text-primary"
              : "border-transparent text-tertiary hover:text-primary"
          }`}
        >
          Gift Activity ({purchaseCount})
        </button>
        <button
          onClick={() => setActiveTab("suggestions")}
          className={`pb-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "suggestions"
              ? "border-brand-600 text-primary"
              : "border-transparent text-tertiary hover:text-primary"
          }`}
        >
          Suggestions ({suggestionCount})
        </button>
      </div>

      {activeTab === "items"
        ? itemsContent
        : activeTab === "purchases"
          ? purchasesContent
          : suggestionsContent}
    </>
  );
}
