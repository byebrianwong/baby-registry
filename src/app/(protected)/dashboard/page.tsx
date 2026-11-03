import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Gift, Calendar, ExternalLink, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function RegistryCard({ registry, badge }: { registry: any; badge?: string }) {
  const totalItems = registry.registry_items?.length || 0;
  const fulfilledItems =
    registry.registry_items?.filter(
      (item: { quantity_fulfilled: number; quantity_needed: number }) =>
        item.quantity_fulfilled >= item.quantity_needed
    ).length || 0;
  const progress = totalItems > 0 ? (fulfilledItems / totalItems) * 100 : 0;
  const totalValue =
    registry.registry_items?.reduce(
      (sum: number, item: { price: number | null }) => sum + (item.price || 0),
      0
    ) || 0;
  const recentPurchases =
    registry.registry_items
      ?.flatMap(
        (item: { purchases: { id: string; status: string; created_at: string; buyer_name: string }[] }) =>
          item.purchases || []
      )
      .filter((p: { status: string }) => p.status !== "cancelled")
      .sort((a: { created_at: string }, b: { created_at: string }) =>
        b.created_at.localeCompare(a.created_at)
      )
      .slice(0, 3) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <Link
            href={`/dashboard/registry/${registry.id}`}
            className="hover:underline"
          >
            {registry.title}
          </Link>
          {badge && (
            <Badge variant="secondary" className="ml-2 shrink-0">
              <Users className="h-3 w-3 mr-1" />
              {badge}
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="flex items-center gap-2">
          {registry.event_date && (
            <>
              <Calendar className="h-3 w-3" />
              {new Date(registry.event_date + "T00:00:00").toLocaleDateString()}
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>
                {fulfilledItems} of {totalItems} items fulfilled
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>

          <div className="flex justify-between text-sm text-tertiary">
            <span>{totalItems} items</span>
            <span>${totalValue.toFixed(0)} total value</span>
          </div>

          {recentPurchases.length > 0 && (
            <div className="text-sm">
              <p className="font-medium mb-1">Recent activity:</p>
              {recentPurchases.map((p: { id: string; buyer_name: string }) => (
                <p key={p.id} className="text-tertiary">
                  {p.buyer_name} reserved an item
                </p>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <Link href={`/dashboard/registry/${registry.id}`}>
                Manage
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link
                href={`/r/${registry.slug}`}
                target="_blank"
              >
                <ExternalLink className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Auto-accept any pending email invites for this user
  const userEmail = user.email;
  if (userEmail) {
    const { data: pendingInvites } = await supabaseAdmin
      .from("registry_invites")
      .select("token")
      .eq("email", userEmail)
      .gt("expires_at", new Date().toISOString());

    if (pendingInvites && pendingInvites.length > 0) {
      for (const invite of pendingInvites) {
        await supabaseAdmin.rpc("accept_registry_invite", {
          p_token: invite.token,
          p_user_id: user.id,
        });
        // Errors (already a manager, fully used, etc.) are ignored
      }
    }
  }

  // Fetch owned registries
  const { data: registries } = await supabase
    .from("registries")
    .select(`
      *,
      registry_items(id, quantity_needed, quantity_fulfilled, price, purchases(id, status, created_at, buyer_name))
    `)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  // Fetch registries where user is a manager (but not owner)
  const { data: managedEntries } = await supabaseAdmin
    .from("registry_managers")
    .select("registry_id")
    .eq("user_id", user.id)
    .eq("role", "manager");

  const managedRegistryIds = (managedEntries || []).map((e) => e.registry_id);

  let sharedRegistries: any[] = [];
  if (managedRegistryIds.length > 0) {
    const { data } = await supabase
      .from("registries")
      .select(`
        *,
        registry_items(id, quantity_needed, quantity_fulfilled, price, purchases(id, status, created_at, buyer_name))
      `)
      .in("id", managedRegistryIds)
      .order("created_at", { ascending: false });
    sharedRegistries = data || [];
  }

  const hasNoRegistries = (!registries || registries.length === 0) && sharedRegistries.length === 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Registries</h1>
          <p className="text-tertiary">
            Manage your registries and track gifts
          </p>
        </div>
        <Button asChild className="!bg-[#004659] hover:!bg-[#003847] !ring-[#004659] !text-white">
          <Link href="/dashboard/registry/new">
            <span className="inline-flex items-center gap-1.5">
              <Plus className="h-4 w-4 shrink-0" />
              New Registry
            </span>
          </Link>
        </Button>
      </div>

      {hasNoRegistries ? (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Gift className="h-12 w-12 text-tertiary" />
            <h2 className="mt-4 text-xl font-semibold">No registries yet</h2>
            <p className="mt-2 text-tertiary">
              Create your first registry to start adding items.
            </p>
            <Button className="mt-6 !bg-[#004659] hover:!bg-[#003847] !ring-[#004659] !text-white" asChild>
              <Link href="/dashboard/registry/new">
                <span className="inline-flex items-center gap-1.5">
                  <Plus className="h-4 w-4 shrink-0" />
                  Create Registry
                </span>
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {registries && registries.length > 0 && (
            <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {registries.map((registry) => (
                <RegistryCard key={registry.id} registry={registry} />
              ))}
            </div>
          )}

          {sharedRegistries.length > 0 && (
            <>
              <div className="mt-10">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Shared with you
                </h2>
                <p className="text-sm text-tertiary mt-1">
                  Registries you&apos;ve been invited to manage
                </p>
              </div>
              <div className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {sharedRegistries.map((registry) => (
                  <RegistryCard key={registry.id} registry={registry} badge="Manager" />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
