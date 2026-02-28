"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Observes a list of element IDs and returns the ID of the one
 * currently closest to the top of the viewport.
 */
export function useScrollSpy(sectionIds: string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);
  const visibleSections = useRef<Map<string, IntersectionObserverEntry>>(
    new Map()
  );

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visibleSections.current.set(entry.target.id, entry);
          } else {
            visibleSections.current.delete(entry.target.id);
          }
        }

        let topmost: string | null = null;
        let topmostTop = Infinity;
        for (const [id, entry] of visibleSections.current) {
          if (entry.boundingClientRect.top < topmostTop) {
            topmostTop = entry.boundingClientRect.top;
            topmost = id;
          }
        }
        if (topmost) {
          setActiveId(topmost);
        }
      },
      {
        rootMargin: "0px 0px -60% 0px",
        threshold: 0,
      }
    );

    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, [sectionIds]);

  return activeId;
}
