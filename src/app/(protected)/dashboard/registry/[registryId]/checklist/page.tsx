"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
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
import { DEFAULT_CHECKLIST, type ChecklistCategory, type ChecklistItem } from "@/lib/checklist-data";
import { createClient } from "@/utils/supabase/client";
import { addRegistryItem } from "@/lib/actions/registry";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
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

/** Match checklist items to registry items using keyword-based fuzzy matching */
function buildMatchedChecklistItems(
  checklistNames: string[],
  registryTitles: string[]
): Set<string> {
  const matched = new Set<string>();
  const lowerTitles = registryTitles.map((t) => t.toLowerCase());

  for (const name of checklistNames) {
    const lower = name.toLowerCase();
    // Split on " / " or " & " to handle alternatives like "Glider / Rocker" or "Burp Cloths & Bibs"
    const alternatives = lower.split(/\s*[\/&]\s*/);
    // Keywords from each alternative (words >2 chars)
    const altKeywords = alternatives.map((alt) =>
      alt.split(/\s+/).filter((w) => w.length > 2)
    );

    const isMatched = lowerTitles.some(
      (title) =>
        title === lower ||
        title.includes(lower) ||
        lower.includes(title) ||
        // Match if ALL keywords from ANY alternative appear in the title
        altKeywords.some(
          (keywords) =>
            keywords.length > 0 && keywords.every((kw) => title.includes(kw))
        ) ||
        // Relaxed: match if the longest keyword (most specific) from any alternative appears
        altKeywords.some((keywords) => {
          if (keywords.length === 0) return false;
          const longest = keywords.reduce((a, b) => (a.length >= b.length ? a : b));
          return longest.length >= 4 && title.includes(longest);
        })
    );

    if (isMatched) matched.add(lower);
  }
  return matched;
}

export default function ChecklistPage() {
  const params = useParams();
  const registryId = params.registryId as string;

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());
  const [addingItem, setAddingItem] = useState<string | null>(null);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);
  const [filter, setFilter] = useState<FilterMode>("all");

  // Fetch existing items and categories
  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const [{ data: cats }, { data: items }] = await Promise.all([
        supabase
          .from("categories")
          .select("id, name")
          .eq("registry_id", registryId),
        supabase
          .from("registry_items")
          .select("title")
          .eq("registry_id", registryId),
      ]);
      setCategories(cats || []);
      if (items) {
        const allChecklistNames = DEFAULT_CHECKLIST.flatMap((c) =>
          c.items.map((i) => i.name)
        );
        setAddedItems(
          buildMatchedChecklistItems(allChecklistNames, items.map((i) => i.title))
        );
      }
    };
    fetchData();
  }, [registryId]);

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
    setExpandedCategories(new Set(DEFAULT_CHECKLIST.map((c) => c.name)));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  const handleAddItem = async (
    categoryName: string,
    item: ChecklistItem
  ) => {
    setAddingItem(item.name);
    const category = categories.find((c) => c.name === categoryName);

    const formData = new FormData();
    formData.set("title", item.name);
    formData.set("categoryId", category?.id || "");
    formData.set("quantityNeeded", item.suggestedQuantity.toString());
    formData.set("isEssential", item.isEssential ? "true" : "false");
    if (item.description) {
      formData.set("notes", item.description);
    }

    const result = await addRegistryItem(registryId, formData);
    if (result?.success) {
      setAddedItems((prev) => new Set(prev).add(item.name.toLowerCase()));
    }
    setAddingItem(null);
  };

  // Calculate stats
  const totalItems = DEFAULT_CHECKLIST.reduce(
    (sum, cat) => sum + cat.items.length,
    0
  );
  const totalEssentials = DEFAULT_CHECKLIST.reduce(
    (sum, cat) => sum + cat.items.filter((i) => i.isEssential).length,
    0
  );
  const addedCount = addedItems.size;

  const filterItems = (items: ChecklistItem[]) => {
    switch (filter) {
      case "essential":
        return items.filter((i) => i.isEssential);
      case "not-added":
        return items.filter((i) => !addedItems.has(i.name.toLowerCase()));
      default:
        return items;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/registry/${registryId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Registry Checklist</h1>
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
            <span className="text-tertiary"> of {totalItems} items added</span>
          </div>
          <Progress
            value={(addedCount / totalItems) * 100}
            className="w-32"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-md border">
            {(["all", "essential", "not-added"] as FilterMode[]).map((mode) => (
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
          <Button variant="ghost" size="sm" onClick={collapseAll}>
            Collapse All
          </Button>
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-3">
        {DEFAULT_CHECKLIST.map((category) => {
          const isExpanded = expandedCategories.has(category.name);
          const Icon = ICON_MAP[category.icon] || Package;
          const filteredItems = filterItems(category.items);
          const catAddedCount = category.items.filter((i) =>
            addedItems.has(i.name.toLowerCase())
          ).length;
          const catEssentials = category.items.filter(
            (i) => i.isEssential
          ).length;
          const catEssentialsAdded = category.items.filter(
            (i) => i.isEssential && addedItems.has(i.name.toLowerCase())
          ).length;

          if (filteredItems.length === 0 && filter !== "all") return null;

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
                    <span className="font-medium">{category.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {catAddedCount}/{category.items.length}
                    </Badge>
                    {catEssentials > 0 && (
                      <span className="text-xs text-tertiary">
                        {catEssentialsAdded}/{catEssentials} essentials
                      </span>
                    )}
                  </div>
                </div>
                <Progress
                  value={
                    category.items.length > 0
                      ? (catAddedCount / category.items.length) * 100
                      : 0
                  }
                  className="w-20"
                />
              </button>

              {isExpanded && (
                <CardContent className="pt-0 pb-4">
                  <div className="divide-y">
                    {filteredItems.map((item) => {
                      const isAdded = addedItems.has(item.name.toLowerCase());
                      const isAdding = addingItem === item.name;

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
                                  isAdded ? "line-through" : ""
                                }`}
                              >
                                {item.name}
                              </span>
                              {item.isEssential && (
                                <Badge className="text-xs">Essential</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-tertiary">
                                {item.suggestedPrice}
                              </span>
                              {item.suggestedQuantity > 1 && (
                                <span className="text-xs text-tertiary">
                                  Qty: {item.suggestedQuantity}
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
                            <Badge variant="secondary" className="shrink-0">
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
                                handleAddItem(category.name, item)
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
  );
}
