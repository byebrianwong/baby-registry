import { DashboardSkeleton } from "@/components/page-skeletons";

// This file sits in the (overview) route group so its skeleton shows only for
// /dashboard. A loading.tsx directly in dashboard/ would also show the
// "My Registries" skeleton while any page under /dashboard loads.
export default function Loading() {
  return <DashboardSkeleton />;
}
