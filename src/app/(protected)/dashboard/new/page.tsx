import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { PlanPicker } from "@/components/plan-picker";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getSessionUser } from "@/lib/viewer";

export const metadata: Metadata = { title: "What are you planning? | Regibee" };

/**
 * The one New button's page. It asks what you're planning, who it's for and
 * how gifts work, then makes the event, the list, or both.
 */
export default async function NewPlanPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  // Guests (anonymous sessions) can only make a registry. Events need an account.
  if (user.is_anonymous) redirect("/dashboard/registry/new");

  const { data: profile } = await supabaseAdmin.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
  const firstName = ((profile?.full_name as string | null) ?? "").trim().split(/\s+/)[0] ?? "";

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-bold">Start something new</h1>
      <p className="mt-1 text-tertiary">
        Three quick questions, and Regibee sets up the invitation, the gift list, or both.
      </p>
      <div className="mt-6">
        <PlanPicker myName={firstName} />
      </div>
    </div>
  );
}
