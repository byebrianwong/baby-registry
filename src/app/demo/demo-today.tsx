"use client";

import { createContext, useContext } from "react";

const DemoTodayContext = createContext<string | null>(null);

/**
 * Gives the demo pages today's date, YYYY-MM-DD, as the server saw it. The
 * demo layout adds it. Stories add it with a fixed date, so their snapshots
 * don't change from day to day.
 */
export function DemoTodayProvider({
  today,
  children,
}: {
  today: string;
  children: React.ReactNode;
}) {
  return <DemoTodayContext.Provider value={today}>{children}</DemoTodayContext.Provider>;
}

export function useDemoToday(): string {
  const today = useContext(DemoTodayContext);
  if (!today) {
    throw new Error("useDemoToday needs a DemoTodayProvider. src/app/demo/layout.tsx adds one.");
  }
  return today;
}
