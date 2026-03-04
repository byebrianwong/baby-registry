"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/utils/supabase/client";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { updateRegistry, deleteRegistry, updatePaymentMethods, updateZipCode } from "@/lib/actions/registry";
import { CategoryManager } from "@/components/category-manager";
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
    settings: { payment_methods?: PaymentMethods; zip_code?: string; tax_enabled?: boolean };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [savingZip, setSavingZip] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [zipError, setZipError] = useState("");
  const [zipSuccess, setZipSuccess] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string; sort_order: number }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const [{ data }, { data: cats }] = await Promise.all([
        supabase
          .from("registries")
          .select("title, event_date, description, is_public, slug, settings")
          .eq("id", registryId)
          .single(),
        supabase
          .from("categories")
          .select("id, name, sort_order")
          .eq("registry_id", registryId)
          .order("sort_order"),
      ]);
      setRegistry(data);
      setCategories(cats || []);
      setLoading(false);
    };
    fetchData();
  }, [registryId]);

  const handleSave = async (formData: FormData) => {
    setSaving(true);
    setError("");
    setSuccess(false);
    const result = await updateRegistry(registryId, formData);
    if (result?.error) {
      setError(result.error);
    } else if (registry) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      // Update local state so form values survive the revalidatePath remount
      setRegistry({
        ...registry,
        title: formData.get("title") as string,
        event_date: (formData.get("eventDate") as string) || null,
        description: (formData.get("description") as string) || null,
        is_public: formData.get("isPublic") === "true",
      });
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

  const handleSaveZip = async (formData: FormData) => {
    setSavingZip(true);
    setZipError("");
    setZipSuccess(false);
    const result = await updateZipCode(registryId, formData);
    if (result?.error) {
      setZipError(result.error);
    } else {
      setZipSuccess(true);
      setTimeout(() => setZipSuccess(false), 2000);
    }
    setSavingZip(false);
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
        <p className="text-tertiary">Loading...</p>
      </div>
    );
  }

  const pm = registry.settings?.payment_methods;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/dashboard/registry/${registryId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Registry Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>Update your registry details</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSave} className="space-y-4">
            <Input
              label="Title"
              name="title"
              defaultValue={registry.title}
              isRequired
            />

            <Input
              label="Due Date"
              name="eventDate"
              type="date"
              defaultValue={registry.event_date || ""}
            />

            <TextArea
              label="Welcome Message"
              name="description"
              defaultValue={registry.description || ""}
              rows={3}
            />

            <div className="space-y-2">
              <span className="text-sm font-medium text-secondary">Visibility</span>
              <p className="text-xs text-tertiary">All registries are accessible via their share link. This setting controls whether search engines can find your registry.</p>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="isPublic"
                    value="true"
                    defaultChecked={registry.is_public}
                  />
                  <span className="text-sm">Public — searchable by search engines</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="isPublic"
                    value="false"
                    defaultChecked={!registry.is_public}
                  />
                  <span className="text-sm">Private — only accessible with link</span>
                </label>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-sm font-medium text-secondary">Share URL</span>
              <p className="text-sm text-tertiary font-mono">
                /r/{registry.slug}
              </p>
            </div>

            {error && <p className="text-sm text-error-primary">{error}</p>}

            <Button type="submit" disabled={saving} className="!bg-[#004659] hover:!bg-[#003847] !ring-[#004659] !text-white">
              {saving ? "Saving..." : success ? "Saved!" : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>Organize your registry items into categories</CardDescription>
        </CardHeader>
        <CardContent>
          <CategoryManager registryId={registryId} categories={categories} inline />
        </CardContent>
      </Card>

      <Separator className="my-8" />

      <Card>
        <CardHeader>
          <CardTitle>Location</CardTitle>
          <CardDescription>
            Used to estimate sales tax on item prices when auto-filling from product URLs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSaveZip} className="space-y-4">
            <Input
              label="Zip Code"
              name="zipCode"
              placeholder="e.g., 90210"
              defaultValue={registry.settings?.zip_code || ""}
            />

            <Checkbox
              name="taxEnabled"
              value="true"
              defaultSelected={registry.settings?.tax_enabled !== false}
              label="Auto-add estimated sales tax to prices"
            />

            {zipError && (
              <p className="text-sm text-error-primary">{zipError}</p>
            )}

            <Button type="submit" disabled={savingZip} className="!bg-[#004659] hover:!bg-[#003847] !ring-[#004659] !text-white">
              {savingZip
                ? "Saving..."
                : zipSuccess
                  ? "Saved!"
                  : "Save location"}
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
            <Input
              label="Venmo"
              name="venmo"
              placeholder="@your-venmo"
              defaultValue={pm?.venmo || ""}
            />

            <Input
              label="PayPal"
              name="paypal"
              placeholder="you@email.com or PayPal.me link"
              defaultValue={pm?.paypal || ""}
            />

            <Input
              label="Zelle"
              name="zelle"
              placeholder="you@email.com or phone number"
              defaultValue={pm?.zelle || ""}
            />

            {paymentError && (
              <p className="text-sm text-error-primary">{paymentError}</p>
            )}

            <Button type="submit" disabled={savingPayment} className="!bg-[#004659] hover:!bg-[#003847] !ring-[#004659] !text-white">
              {savingPayment
                ? "Saving..."
                : paymentSuccess
                  ? "Saved!"
                  : "Save payment methods"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      <Card className="border-error-primary/50">
        <CardHeader>
          <CardTitle className="text-error-primary">Danger Zone</CardTitle>
          <CardDescription>
            Permanently delete this registry and all its items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={handleDelete}>
            Delete registry
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
