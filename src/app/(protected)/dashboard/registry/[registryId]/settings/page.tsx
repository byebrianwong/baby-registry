"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/utils/supabase/client";
import { updateRegistry, deleteRegistry, updatePaymentMethods } from "@/lib/actions/registry";
import type { PaymentMethods } from "@/lib/types";

export default function RegistrySettingsPage() {
  const router = useRouter();
  const params = useParams();
  const registryId = params.registryId as string;

  const [registry, setRegistry] = useState<{
    title: string;
    event_date: string | null;
    description: string | null;
    is_public: boolean;
    slug: string;
    settings: { payment_methods?: PaymentMethods };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [error, setError] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    const fetchRegistry = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("registries")
        .select("title, event_date, description, is_public, slug, settings")
        .eq("id", registryId)
        .single();
      setRegistry(data);
      setLoading(false);
    };
    fetchRegistry();
  }, [registryId]);

  const handleSave = async (formData: FormData) => {
    setSaving(true);
    setError("");
    const result = await updateRegistry(registryId, formData);
    if (result?.error) {
      setError(result.error);
    }
    setSaving(false);
  };

  const handleSavePayment = async (formData: FormData) => {
    setSavingPayment(true);
    setPaymentError("");
    setPaymentSuccess(false);
    const result = await updatePaymentMethods(registryId, formData);
    if (result?.error) {
      setPaymentError(result.error);
    } else {
      setPaymentSuccess(true);
      setTimeout(() => setPaymentSuccess(false), 2000);
    }
    setSavingPayment(false);
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this registry? This action cannot be undone."
      )
    )
      return;
    await deleteRegistry(registryId);
  };

  if (loading || !registry) {
    return (
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const pm = registry.settings?.payment_methods;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Registry Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Update your registry details</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSave} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                defaultValue={registry.title}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventDate">Due Date</Label>
              <Input
                id="eventDate"
                name="eventDate"
                type="date"
                defaultValue={registry.event_date || ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Welcome Message</Label>
              <Textarea
                id="description"
                name="description"
                defaultValue={registry.description || ""}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Visibility</Label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="isPublic"
                    value="true"
                    defaultChecked={registry.is_public}
                  />
                  <span className="text-sm">Public</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="isPublic"
                    value="false"
                    defaultChecked={!registry.is_public}
                  />
                  <span className="text-sm">Private</span>
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Share URL</Label>
              <p className="text-sm text-muted-foreground font-mono">
                /r/{registry.slug}
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>
            Add your payment info so gift givers can send you money for cash
            funds and items you&apos;ve already purchased.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSavePayment} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="venmo">Venmo</Label>
              <Input
                id="venmo"
                name="venmo"
                placeholder="@your-venmo"
                defaultValue={pm?.venmo || ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="paypal">PayPal</Label>
              <Input
                id="paypal"
                name="paypal"
                placeholder="you@email.com or PayPal.me link"
                defaultValue={pm?.paypal || ""}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="zelle">Zelle</Label>
              <Input
                id="zelle"
                name="zelle"
                placeholder="you@email.com or phone number"
                defaultValue={pm?.zelle || ""}
              />
            </div>

            {paymentError && (
              <p className="text-sm text-destructive">{paymentError}</p>
            )}

            <Button type="submit" disabled={savingPayment}>
              {savingPayment
                ? "Saving..."
                : paymentSuccess
                  ? "Saved!"
                  : "Save Payment Methods"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Permanently delete this registry and all its items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleDelete}>
            Delete Registry
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
