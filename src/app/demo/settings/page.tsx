"use client";

import { useState } from "react";
import Link from "next/link";
import { Baby, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DEMO_REGISTRY } from "@/lib/demo-data";

export default function DemoSettingsPage() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [paymentSaved, setPaymentSaved] = useState(false);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSavePayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavingPayment(true);
    await new Promise((r) => setTimeout(r, 800));
    setSavingPayment(false);
    setPaymentSaved(true);
    setTimeout(() => setPaymentSaved(false), 2000);
  };

  const handleDelete = () => {
    alert("This is a demo — the registry cannot be deleted.");
  };

  const pm = DEMO_REGISTRY.settings?.payment_methods;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Demo banner */}
      <div className="bg-brand-solid text-white py-2 px-4 text-center text-sm">
        This is a demo — changes are local and won&apos;t be saved.{" "}
        <Link href="/signup" className="underline font-medium">
          Create your own registry
        </Link>
      </div>

      <header className="sticky top-0 z-50 w-full border-b bg-primary/95 backdrop-blur supports-[backdrop-filter]:bg-primary/60">
        <div className="container mx-auto flex h-14 items-center px-4">
          <Link
            href="/demo/dashboard"
            className="flex items-center gap-2 font-semibold"
          >
            <Baby className="h-5 w-5 text-brand-600" />
            <span>Baby Akachan</span>
          </Link>
          <span className="ml-4 text-sm text-tertiary hidden md:inline">
            demo@example.com
          </span>
        </div>
      </header>

      <main className="flex-1">
        <div className="container mx-auto max-w-2xl px-4 py-8">
          <div className="flex items-center gap-2 mb-6">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/demo/manage">
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
              <form onSubmit={handleSave} className="space-y-4">
                <Input
                  label="Title"
                  name="title"
                  defaultValue={DEMO_REGISTRY.title}
                  isRequired
                />

                <Input
                  label="Due Date"
                  name="eventDate"
                  type="date"
                  defaultValue={DEMO_REGISTRY.event_date || ""}
                />

                <TextArea
                  label="Welcome Message"
                  name="description"
                  defaultValue={DEMO_REGISTRY.description || ""}
                  rows={3}
                />

                <div className="space-y-2">
                  <span className="text-sm font-medium text-secondary">
                    Visibility
                  </span>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="isPublic"
                        value="true"
                        defaultChecked={DEMO_REGISTRY.is_public}
                      />
                      <span className="text-sm">Public</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="isPublic"
                        value="false"
                        defaultChecked={!DEMO_REGISTRY.is_public}
                      />
                      <span className="text-sm">Private</span>
                    </label>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-sm font-medium text-secondary">
                    Share URL
                  </span>
                  <p className="text-sm text-tertiary font-mono">
                    /r/{DEMO_REGISTRY.slug}
                  </p>
                </div>

                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : saved ? "Saved!" : "Save Changes"}
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
              <form onSubmit={handleSavePayment} className="space-y-4">
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

                <Button type="submit" disabled={savingPayment}>
                  {savingPayment
                    ? "Saving..."
                    : paymentSaved
                      ? "Saved!"
                      : "Save Payment Methods"}
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
                Delete Registry
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
