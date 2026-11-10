"use client";

import { useState } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, Copy, ImageIcon, LinkIcon, Mail, Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";
import { PhotoUploadButton } from "@/components/photo-upload-button";
import { ProfileListingField } from "@/components/profile-listing-field";
import { RegistryAvatar, monogramFor } from "@/components/registry-avatar";
import { StoreRegistriesCard } from "@/components/store-registries-card";
import { DEMO_ME } from "@/lib/demo-people";
import { demoRegistryPath, findDemoRegistry, type DemoManager } from "@/lib/demo-registries";
import { copyForRegistry } from "@/lib/registry-copy";
import { parseRetailerRegistries } from "@/lib/retailers";
import { useDemoToday } from "../demo-today";
import { DemoOwnerShell } from "./demo-shell";
import { DemoCategoryManager, demoUpload } from "./demo-manage-registry";

type Invite = { id: string; email: string | null; maxUses: number | null; expires: string };

/** "Saving...", then "Saved!" for two seconds. Nothing is saved. */
function useFakeSave() {
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const save = async () => {
    setState("saving");
    await new Promise((r) => setTimeout(r, 500));
    setState("saved");
    setTimeout(() => setState("idle"), 2000);
  };
  const label = (idle: string) => (state === "saving" ? "Saving..." : state === "saved" ? "Saved!" : idle);
  return { save, saving: state === "saving", label };
}

function submitWith(save: () => void) {
  return (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    save();
  };
}

/**
 * A demo registry's settings. Like
 * src/app/(protected)/dashboard/registry/[registryId]/settings/page.tsx,
 * with every change kept on this page.
 */
export function DemoRegistrySettings({ registryId }: { registryId: string }) {
  const today = useDemoToday();
  const registry = findDemoRegistry(today, { id: registryId });
  if (!registry || registry.owner.public_id !== DEMO_ME.public_id) notFound();
  const copy = copyForRegistry(registry);
  const general = useFakeSave();
  const zip = useFakeSave();
  const payment = useFakeSave();
  const address = useFakeSave();

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(registry.is_public);
  const [listed, setListed] = useState(registry.listed_on_profile);
  const [slugCopied, setSlugCopied] = useState(false);
  const [categories, setCategories] = useState(registry.categories);

  const [managers, setManagers] = useState<DemoManager[]>(registry.managers);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteSent, setInviteSent] = useState(false);
  const [maxUses, setMaxUses] = useState("1");
  const [generatedLink, setGeneratedLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);

  const sharePath = demoRegistryPath(registry);
  const pm = registry.settings.payment_methods;
  const inAWeek = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const inviteByEmail = (e: React.FormEvent) => {
    e.preventDefault();
    const email = inviteEmail.trim().toLowerCase();
    if (!email) return;
    setInvites((prev) => [...prev, { id: `invite-${Date.now()}`, email, maxUses: 1, expires: inAWeek() }]);
    setInviteEmail("");
    setInviteSent(true);
    setTimeout(() => setInviteSent(false), 2000);
  };

  const generateLink = () => {
    const token = Math.random().toString(36).slice(2, 12);
    setGeneratedLink(`${window.location.origin}/invite/demo-${token}`);
    setInvites((prev) => [
      ...prev,
      { id: `invite-${token}`, email: null, maxUses: maxUses === "unlimited" ? null : Number(maxUses), expires: inAWeek() },
    ]);
  };

  return (
    <DemoOwnerShell>
      <div className="container mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/demo/dashboard/registry/${registry.id}`} aria-label="Back to registry">
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
            <div className="mb-6 flex items-center gap-4">
              {photoUrl || monogramFor(registry.honoree_names) ? (
                <RegistryAvatar
                  photoUrl={photoUrl}
                  names={registry.honoree_names}
                  className="size-20 text-2xl ring-0 shadow-none"
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="flex size-20 shrink-0 items-center justify-center rounded-full border border-dashed border-primary text-tertiary"
                >
                  <ImageIcon className="h-6 w-6" />
                </span>
              )}
              <div className="min-w-0 space-y-2">
                <div>
                  <p className="text-sm font-medium text-secondary">Registry photo</p>
                  <p className="text-xs text-tertiary">
                    Shown at the top of your registry page. Without one, guests see your initials.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <PhotoUploadButton
                    label={photoUrl ? "Change photo" : "Upload photo"}
                    upload={demoUpload}
                    onUploaded={setPhotoUrl}
                    onError={setPhotoError}
                  />
                  {photoUrl && (
                    <Button type="button" variant="ghost" className="h-10" onClick={() => setPhotoUrl(null)}>
                      Remove
                    </Button>
                  )}
                </div>
                {photoError && <p className="text-xs text-error-primary">{photoError}</p>}
              </div>
            </div>

            <form onSubmit={submitWith(general.save)} className="space-y-4">
              <Input label="Title" name="title" defaultValue={registry.title} isRequired />
              <Input
                label={copy.honoreeLabel}
                name="honoreeNames"
                placeholder={copy.honoreePlaceholder}
                defaultValue={registry.honoree_names}
                hint="The name shown to gift givers and in email notifications."
              />
              <Input
                label={copy.eventDateLabel}
                name="eventDate"
                type="date"
                defaultValue={registry.event_date || ""}
              />
              <TextArea label="Welcome Message" name="description" defaultValue={registry.description || ""} rows={3} />

              <div className="space-y-2">
                <span className="text-sm font-medium text-secondary">Visibility</span>
                <p className="text-xs text-tertiary">
                  Anyone with the share link can open your registry either way. This controls search engines, and who
                  sees it on your profile.
                </p>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="isPublic"
                      value="true"
                      checked={isPublic}
                      onChange={() => setIsPublic(true)}
                    />
                    <span className="text-sm">Public — searchable by search engines</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="isPublic"
                      value="false"
                      checked={!isPublic}
                      onChange={() => setIsPublic(false)}
                    />
                    <span className="text-sm">
                      Private — hidden from search engines, and only followers you approve see it on your profile
                    </span>
                  </label>
                </div>
              </div>

              <ProfileListingField
                isPublic={isPublic}
                isSelected={listed}
                onChange={setListed}
                hasShippingAddress={Boolean(registry.settings.shipping_address)}
              />

              <div className="space-y-1">
                <span className="text-sm font-medium text-secondary">Share URL</span>
                <div className="flex items-center gap-4">
                  <p className="text-sm text-tertiary font-mono">{sharePath}</p>
                  <button
                    type="button"
                    aria-label="Copy share link"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}${sharePath}`);
                      setSlugCopied(true);
                      setTimeout(() => setSlugCopied(false), 2000);
                    }}
                    className="text-tertiary hover:text-secondary transition-colors"
                  >
                    {slugCopied ? (
                      <span className="inline-flex items-center gap-1 text-sm">
                        <Check className="h-4 w-4" />
                        Copied!
                      </span>
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={general.saving}>
                {general.label("Save changes")}
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
          <CardContent className="space-y-3">
            <p className="text-sm text-tertiary">
              {categories.length === 0 ? "No categories yet." : categories.map((c) => c.name).join(", ")}
            </p>
            <DemoCategoryManager
              categories={categories}
              onAdd={(name) =>
                setCategories((prev) => [...prev, { id: `cat-${Date.now()}`, name, sort_order: prev.length }])
              }
              onRename={(id, name) => setCategories((prev) => prev.map((c) => (c.id === id ? { ...c, name } : c)))}
              onDelete={(id) => setCategories((prev) => prev.filter((c) => c.id !== id))}
            />
          </CardContent>
        </Card>

        <Separator className="my-8" />

        <Card>
          <CardHeader>
            <CardTitle>Location</CardTitle>
            <CardDescription>Used to estimate sales tax on item prices when auto-filling from product URLs</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitWith(zip.save)} className="space-y-4">
              <Input
                label="Zip Code"
                name="zipCode"
                placeholder="e.g., 90210"
                defaultValue={registry.settings.zip_code || ""}
              />
              <Checkbox
                name="taxEnabled"
                value="true"
                defaultSelected
                label="Auto-add estimated sales tax to prices"
              />
              <Button type="submit" disabled={zip.saving}>
                {zip.label("Save location")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Separator className="my-8" />

        <Card>
          <CardHeader>
            <CardTitle>Payment Methods</CardTitle>
            <CardDescription>
              Add your payment info so gift givers can send you money for cash funds and items you&apos;ve already
              purchased.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitWith(payment.save)} className="space-y-4">
              <Input label="Venmo" name="venmo" placeholder="@your-venmo" defaultValue={pm?.venmo || ""} />
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
              <Button type="submit" disabled={payment.saving}>
                {payment.label("Save payment methods")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Separator className="my-8" />

        <Card>
          <CardHeader>
            <CardTitle>Shipping Address</CardTitle>
            <CardDescription>
              Share your shipping address with gift givers so they know where to send gifts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitWith(address.save)} className="space-y-4">
              <TextArea
                label="Address"
                name="shippingAddress"
                placeholder={"Remi & Max Porter\n123 Main Street, Apt 4B\nNew York, NY 10001"}
                defaultValue={registry.settings.shipping_address || ""}
                rows={3}
              />
              <Button type="submit" disabled={address.saving}>
                {address.label("Save address")}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Separator className="my-8" />

        {registry.registry_type === "baby" && (
          <>
            <div id="store-registries" className="scroll-mt-20">
              <StoreRegistriesCard
                registryId={registry.id}
                initialRegistries={parseRetailerRegistries(registry.settings)}
                saveAction={async (_id, registries) => ({ registries })}
              />
            </div>
            <Separator className="my-8" />
          </>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Managers
            </CardTitle>
            <CardDescription>
              Invite others to help manage this registry. Managers can add/edit items, view gift activity, and manage
              categories.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-secondary">Current managers</h4>
              <div className="space-y-2">
                {managers.map((m) => (
                  <div key={m.email} className="flex items-center justify-between rounded-md border px-3 py-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{m.name}</p>
                        <p className="text-xs text-tertiary truncate">{m.email}</p>
                      </div>
                      <Badge variant={m.role === "owner" ? "default" : "secondary"}>
                        {m.role === "owner" ? "Owner" : "Manager"}
                      </Badge>
                    </div>
                    {m.role !== "owner" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={`Remove ${m.name}`}
                        onClick={() => setManagers((prev) => prev.filter((x) => x.email !== m.email))}
                        className="text-error-primary hover:text-error-primary shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-secondary flex items-center gap-1.5">
                <Mail className="h-4 w-4" />
                Invite by email
              </h4>
              <form onSubmit={inviteByEmail} className="flex gap-2">
                <div className="flex-1">
                  <Input
                    type="email"
                    aria-label="Email address to invite"
                    placeholder="coparent@example.com"
                    value={inviteEmail}
                    onChange={setInviteEmail}
                  />
                </div>
                <Button type="submit" disabled={!inviteEmail.trim()} className="shrink-0">
                  {inviteSent ? "Sent!" : "Send Invite"}
                </Button>
              </form>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="text-sm font-medium text-secondary flex items-center gap-1.5">
                <LinkIcon className="h-4 w-4" />
                Generate invite link
              </h4>
              <div className="flex gap-2 items-end">
                <div>
                  <label htmlFor="invite-max-uses" className="text-xs text-tertiary">
                    Max uses
                  </label>
                  <select
                    id="invite-max-uses"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    className="block w-full rounded-md border px-3 py-2 text-sm bg-transparent"
                  >
                    <option value="1">1 use</option>
                    <option value="5">5 uses</option>
                    <option value="10">10 uses</option>
                    <option value="unlimited">Unlimited</option>
                  </select>
                </div>
                <Button onClick={generateLink} variant="outline" className="shrink-0">
                  Generate
                </Button>
              </div>
              {generatedLink && (
                <div className="flex items-center gap-2 mt-2 rounded-md border px-3 py-2 bg-muted/50">
                  <code className="text-xs break-all flex-1">{generatedLink}</code>
                  <button
                    type="button"
                    aria-label="Copy invite link"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedLink);
                      setLinkCopied(true);
                      setTimeout(() => setLinkCopied(false), 2000);
                    }}
                    className="text-tertiary hover:text-secondary transition-colors shrink-0"
                  >
                    {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>
              )}
            </div>

            {invites.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-secondary">Active invites</h4>
                  <div className="space-y-2">
                    {invites.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                        <div className="min-w-0">
                          <p className="text-sm truncate">{inv.email ?? "Link invite"}</p>
                          <p className="text-xs text-tertiary">
                            0{inv.maxUses !== null ? `/${inv.maxUses}` : ""} uses · Expires{" "}
                            {new Date(inv.expires).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setInvites((prev) => prev.filter((x) => x.id !== inv.id))}
                          className="text-error-primary hover:text-error-primary shrink-0"
                        >
                          Revoke
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Separator className="my-8" />

        <Card className="border-error-primary/50">
          <CardHeader>
            <CardTitle className="text-error-primary">Danger Zone</CardTitle>
            <CardDescription>Permanently delete this registry and all its items</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={() => alert("This is a demo, so the registry can't be deleted.")}
            >
              Delete registry
            </Button>
          </CardContent>
        </Card>
      </div>
    </DemoOwnerShell>
  );
}
