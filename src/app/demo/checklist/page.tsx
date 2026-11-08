"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Moon,
  Utensils,
  Package,
  Car,
  Bath,
  Shirt,
  HeartPulse,
  BookOpen,
  Heart,
  Gift,
  Check,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import {
  DEFAULT_CHECKLIST,
  type ChecklistItem,
} from "@/lib/checklist-data";
import { DEMO_ITEMS } from "@/lib/demo-data";
import { Logo } from "@/components/logo";

const ICON_MAP: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  moon: Moon,
  utensils: Utensils,
  package: Package,
  car: Car,
  bath: Bath,
  shirt: Shirt,
  "heart-pulse": HeartPulse,
  "book-open": BookOpen,
  heart: Heart,
  gift: Gift,
};

type FilterMode = "all" | "essential" | "not-added";

export default function DemoChecklistPage() {
  // Seed initial "added" items from demo data
  const initialAdded = new Set(
    DEMO_ITEMS.map((i) => i.title.toLowerCase())
  );
  const [addedItems, setAddedItems] = useState<Set<string>>(initialAdded);
  const [expandedCategories, setExpandedCategories] = useState<
    Set<string>
  >(new Set());
  const [addingItem, setAddingItem] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");

  const toggleCategory = (name: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedCategories(
      new Set(DEFAULT_CHECKLIST.map((c) => c.name))
    );
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  const handleAddItem = (item: ChecklistItem) => {
    setAddingItem(item.name);
    // Simulate a brief delay
    setTimeout(() => {
      setAddedItems(
        (prev) => new Set(prev).add(item.name.toLowerCase())
      );
      setAddingItem(null);
    }, 300);
  };

  const totalItems = DEFAULT_CHECKLIST.reduce(
    (sum, cat) => sum + cat.items.length,
    0
  );
  const addedCount = addedItems.size;

  const filterItems = (items: ChecklistItem[]) => {
    switch (filter) {
      case "essential":
        return items.filter((i) => i.isEssential);
      case "not-added":
        return items.filter(
          (i) => !addedItems.has(i.name.toLowerCase())
        );
      default:
        return items;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Demo banner */}
      <div className="bg-brand-solid text-white py-2 px-4 text-center text-sm">
        This is a demo checklist — items are added locally.{" "}
        <Link href="/signup" className="underline font-medium">
          Create your own registry
        </Link>
      </div>

      <header className="sticky top-0 z-50 w-full border-b bg-primary/95 backdrop-blur supports-[backdrop-filter]:bg-primary/60">
        <div className="container mx-auto flex h-14 items-center px-4">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold"
          >
            <Logo />
          </Link>
          <span className="ml-auto text-sm text-tertiary hidden md:inline">
            demo@example.com
          </span>
        </div>
      </header>

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/demo/manage" aria-label="Back to registry">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">
                Registry Checklist
              </h1>
              <p className="text-sm text-tertiary">
                Browse recommended items and add them to your registry
              </p>
            </div>
          </div>

          {/* Stats & Filters */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="font-medium">{addedCount}</span>
                <span className="text-tertiary">
                  {" "}
                  of {totalItems} items added
                </span>
              </div>
              <Progress
                aria-label="Checklist items added"
                value={(addedCount / totalItems) * 100}
                className="w-32"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex rounded-md border">
                {(
                  ["all", "essential", "not-added"] as FilterMode[]
                ).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setFilter(mode)}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                      filter === mode
                        ? "bg-brand-solid text-white"
                        : "hover:bg-active"
                    } ${mode === "all" ? "rounded-l-md" : ""} ${
                      mode === "not-added" ? "rounded-r-md" : ""
                    }`}
                  >
                    {mode === "all"
                      ? "All"
                      : mode === "essential"
                        ? "Essentials"
                        : "Not Added"}
                  </button>
                ))}
              </div>
              <Button variant="ghost" size="sm" onClick={expandAll}>
                Expand All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={collapseAll}
              >
                Collapse All
              </Button>
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-3">
            {DEFAULT_CHECKLIST.map((category) => {
              const isExpanded = expandedCategories.has(
                category.name
              );
              const Icon = ICON_MAP[category.icon] || Package;
              const filteredItems = filterItems(category.items);
              const catAddedCount = category.items.filter((i) =>
                addedItems.has(i.name.toLowerCase())
              ).length;
              const catEssentials = category.items.filter(
                (i) => i.isEssential
              ).length;
              const catEssentialsAdded = category.items.filter(
                (i) =>
                  i.isEssential &&
                  addedItems.has(i.name.toLowerCase())
              ).length;

              if (filteredItems.length === 0 && filter !== "all")
                return null;

              return (
                <Card key={category.name}>
                  <button
                    onClick={() => toggleCategory(category.name)}
                    className="flex w-full items-center gap-3 p-4 text-left hover:bg-active transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                    <Icon className="h-5 w-5 text-brand-600 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {category.name}
                        </span>
                        <Badge
                          variant="secondary"
                          className="text-xs"
                        >
                          {catAddedCount}/{category.items.length}
                        </Badge>
                        {catEssentials > 0 && (
                          <span className="text-xs text-tertiary">
                            {catEssentialsAdded}/{catEssentials}{" "}
                            essentials
                          </span>
                        )}
                      </div>
                    </div>
                    <Progress
                      aria-label={`${category.name} items added`}
                      value={
                        category.items.length > 0
                          ? (catAddedCount / category.items.length) *
                            100
                          : 0
                      }
                      className="w-20"
                    />
                  </button>

                  {isExpanded && (
                    <CardContent className="pt-0 pb-4">
                      <div className="divide-y">
                        {filteredItems.map((item) => {
                          const isAdded = addedItems.has(
                            item.name.toLowerCase()
                          );
                          const isAdding =
                            addingItem === item.name;

                          return (
                            <div
                              key={item.name}
                              className={`flex items-center gap-3 py-3 ${
                                isAdded ? "opacity-50" : ""
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`text-sm font-medium ${
                                      isAdded
                                        ? "line-through"
                                        : ""
                                    }`}
                                  >
                                    {item.name}
                                  </span>
                                  {item.isEssential && (
                                    <Badge className="text-xs">
                                      Essential
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-tertiary">
                                    {item.suggestedPrice}
                                  </span>
                                  {item.suggestedQuantity > 1 && (
                                    <span className="text-xs text-tertiary">
                                      Qty:{" "}
                                      {item.suggestedQuantity}
                                    </span>
                                  )}
                                </div>
                                {item.description && (
                                  <p className="text-xs text-tertiary mt-0.5 line-clamp-1">
                                    {item.description}
                                  </p>
                                )}
                              </div>

                              {isAdded ? (
                                <Badge
                                  variant="secondary"
                                  className="shrink-0"
                                >
                                  <Check className="h-3 w-3 mr-1" />
                                  Added
                                </Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="shrink-0"
                                  disabled={isAdding}
                                  onClick={() =>
                                    handleAddItem(item)
                                  }
                                >
                                  {isAdding ? (
                                    "Adding..."
                                  ) : (
                                    <>
                                      <Plus className="h-3 w-3 mr-1" />
                                      Add
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
