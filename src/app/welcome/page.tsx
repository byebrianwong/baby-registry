import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ChooseUsername } from "@/components/choose-username";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = {
  title: "Choose a username | Regibee",
  robots: { index: false, follow: false },
};

// Only paths on this site, so a crafted link can't send people elsewhere.
function safeNext(raw: string | undefined) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
}

// Sign-up sends new accounts here before they continue to where they were
// going (?next=). See src/app/(auth)/signup/page.tsx.
export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeNext((await searchParams).next);

  // Guests have anonymous sessions and can't claim a username.
  const viewer = await getViewer();
  if (!viewer) {
    redirect(`/login?redirect=${encodeURIComponent(`/welcome?next=${encodeURIComponent(next)}`)}`);
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, username")
    .eq("id", viewer.id)
    .single();

  // Already has one, for example after going back to this page.
  if (profile?.username) {
    redirect(next);
  }

  return <ChooseUsername fullName={profile?.full_name?.trim() ?? ""} next={next} />;
}
