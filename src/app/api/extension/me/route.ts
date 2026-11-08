import { NextResponse } from "next/server";
import { authenticateExtension, managedRegistryIds } from "@/lib/extension-server";
import { parseRetailerRegistries } from "@/lib/retailers";
import type { MeResponse } from "@/lib/extension";

// GET → who the extension is signed in as, and the registries they manage.
export async function GET(request: Request) {
  const auth = await authenticateExtension(request);
  if (auth.response) return auth.response;
  const { user, supabase } = auth;

  const ids = await managedRegistryIds(user.id);
  const [{ data: profile }, { data: registries }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    ids.length > 0
      ? supabase
          .from("registries")
          .select("id, title, settings")
          .in("id", ids)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as { id: string; title: string; settings: unknown }[] }),
  ]);

  const body: MeResponse = {
    user: {
      name: (profile?.full_name as string | null)?.trim() || user.email || "You",
      email: user.email ?? null,
    },
    // Only the linked store registries leave the server. Settings also holds
    // the shipping address and payment details.
    registries: (registries ?? []).map((r) => ({
      id: r.id as string,
      title: r.title as string,
      storeRegistries: parseRetailerRegistries(r.settings),
    })),
  };
  return NextResponse.json(body);
}
