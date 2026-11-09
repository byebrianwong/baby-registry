import { DashboardTabs } from "@/components/dashboard-tabs";
import { getViewer } from "@/lib/viewer";

// /dashboard, /dashboard/events and /dashboard/following share this layout, so the tabs stay on
// screen while you switch between them. Each tab keeps its own loading.tsx in
// its own folder. A loading.tsx here would show one tab's skeleton for both.
export default async function DashboardTabsLayout({ children }: { children: React.ReactNode }) {
  // getViewer counts guests (anonymous sessions) as signed out, and guests
  // can't plan events or follow anyone. The top bar calls it too, and it's
  // cached per request.
  const viewer = await getViewer();

  return (
    <>
      <DashboardTabs hasAccount={Boolean(viewer)} />
      {children}
    </>
  );
}
