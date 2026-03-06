import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, Gift, Calendar, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { createClient } from "@/utils/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: registries } = await supabase
    .from("registries")
    .select(`
      *,
      registry_items(id, quantity_needed, quantity_fulfilled, price, purchases(id, status, created_at, buyer_name))
    `)
    .eq("owner_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Registries</h1>
          <p className="text-tertiary">
            Manage your baby registries and track gifts
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

      {!registries || registries.length === 0 ? (
        <Card className="mt-8">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Gift className="h-12 w-12 text-tertiary" />
            <h2 className="mt-4 text-xl font-semibold">No registries yet</h2>
            <p className="mt-2 text-tertiary">
              Create your first registry to start adding items.
            </p>
            <Button className="mt-6" asChild>
              <Link href="/dashboard/registry/new">
                <Plus className="mr-2 h-4 w-4" />
                Create Registry
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {registries.map((registry) => {
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
              <Card key={registry.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <Link
                      href={`/dashboard/registry/${registry.id}`}
                      className="hover:underline"
                    >
                      {registry.title}
                    </Link>
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
          })}
        </div>
      )}
    </div>
  );
}
