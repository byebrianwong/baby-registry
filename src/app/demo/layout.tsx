import { connection } from "next/server";
import { DemoTodayProvider } from "./demo-today";

// The demo's dates count from today (src/lib/demo-data.ts). So render each
// request: a page built at deploy time would keep that day's dates. The day is
// worked out here and handed down, so the server's HTML and the browser agree.
export default async function DemoLayout({ children }: { children: React.ReactNode }) {
  await connection();
  const today = new Date().toISOString().slice(0, 10);
  return <DemoTodayProvider today={today}>{children}</DemoTodayProvider>;
}
