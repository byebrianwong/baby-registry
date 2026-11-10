import { permanentRedirect } from "next/navigation";

// The demo's pages moved under /demo/dashboard, like the real dashboard's.
export default function OldDemoManagePage() {
  permanentRedirect("/demo/dashboard/registry/baby");
}
