import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ExtensionConnect } from "@/components/extension-connect";
import { CONNECT_PATH } from "@/lib/extension";
import { getViewer } from "@/lib/viewer";
import { createClient } from "@/utils/supabase/server";

export const metadata: Metadata = {
  title: "Connect the extension | Regibee",
  robots: { index: false, follow: false },
};

// The Regibee extension opens this page to sign in. The page creates a
// session for the extension and passes it to the extension's content script.
export default async function ConnectExtensionPage() {
  const viewer = await getViewer();
  if (!viewer) {
    redirect(`/login?redirect=${encodeURIComponent(CONNECT_PATH)}`);
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", viewer.id)
    .single();
  const name = (profile?.full_name as string | null)?.trim() || viewer.email || "you";

  return <ExtensionConnect name={name} />;
}
