"use client";

import { useState, useMemo } from "react";
import { List, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useScrollSpy } from "@/hooks/use-scroll-spy";
import { cn } from "@/lib/utils";

export interface CategoryNavItem {
  id: string;
  name: string;
  count: number;
}

interface CategoryNavProps {
  categories: CategoryNavItem[];
}

export function CategoryNav({ categories }: CategoryNavProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const sectionIds = useMemo(
    () => categories.map((c) => c.id),
    [categories]
  );

  const activeId = useScrollSpy(sectionIds);

  const handleScrollTo = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    setMobileOpen(false);
  };

  const navList = (
    <nav aria-label="Category navigation">
      <ul className="flex flex-col gap-0.5">
        {categories.map((category) => {
          const isActive = activeId === category.id;
          return (
            <li key={category.id}>
              <button
                type="button"
                onClick={() => handleScrollTo(category.id)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2 text-sm transition-colors text-left",
                  isActive
                    ? "bg-brand-50 text-brand-700 font-medium"
                    : "text-tertiary hover:text-primary hover:bg-secondary"
                )}
              >
                <span className="truncate">{category.name}</span>
                <Badge variant="secondary" className="ml-2 shrink-0 text-xs">
                  {category.count}
                </Badge>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar (lg+) */}
      <aside
        className={cn(
          "hidden lg:block sticky top-20 self-start shrink-0 transition-all duration-200",
          isCollapsed ? "w-10" : "w-56"
        )}
      >
        {isCollapsed ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(false)}
            aria-label="Expand category navigation"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-quaternary">
                Categories
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCollapsed(true)}
                aria-label="Collapse category navigation"
              >
                <PanelLeftClose className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Separator />
            {navList}
          </div>
        )}
      </aside>

      {/* Mobile floating button + Sheet (<lg) */}
      <div className="lg:hidden fixed bottom-6 left-4 z-40">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              className="rounded-full shadow-lg"
              aria-label="Open category navigation"
            >
              <List className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left">
            <SheetHeader>
              <SheetTitle>Categories</SheetTitle>
            </SheetHeader>
            <div className="px-4 pb-4">
              {navList}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
