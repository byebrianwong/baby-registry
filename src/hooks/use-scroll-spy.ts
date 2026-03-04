"use client";

import { useState, useEffect, useRef, useCallback } from "react";

/**
 * Observes a list of element IDs and returns the ID of the one
 * currently closest to (but above or at) the top of the viewport.
 */
export function useScrollSpy(sectionIds: string[]): string | null {
  const [activeId, setActiveId] = useState<string | null>(null);
  const elementsRef = useRef<HTMLElement[]>([]);

  const computeActive = useCallback(() => {
    let closest: string | null = null;
    let closestDistance = -Infinity;

    for (const el of elementsRef.current) {
      const rect = el.getBoundingClientRect();
      // Pick the last section whose top has scrolled past (or is at) the top area
      if (rect.top <= 100) {
        if (rect.top > closestDistance) {
          closestDistance = rect.top;
          closest = el.id;
        }
      }
    }

    // If nothing is above the threshold, pick the first section
    if (!closest && elementsRef.current.length > 0) {
      closest = elementsRef.current[0].id;
    }

    if (closest) {
      setActiveId(closest);
    }
  }, []);

  useEffect(() => {
    elementsRef.current = sectionIds
      .map((id) => document.getElementById(id))
      .filter(Boolean) as HTMLElement[];

    computeActive();

    window.addEventListener("scroll", computeActive, { passive: true });
    return () => window.removeEventListener("scroll", computeActive);
  }, [sectionIds, computeActive]);

  return activeId;
}
