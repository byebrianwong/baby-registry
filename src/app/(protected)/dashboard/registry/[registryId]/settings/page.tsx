"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Copy, Check, X, Users, Mail, LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/utils/supabase/client";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import {
  updateRegistry,
  deleteRegistry,
  updatePaymentMethods,
  updateShippingAddress,
  updateZipCode,
  inviteManagerByEmail,
  generateInviteLink,
  removeManager,
  revokeInvite,
  listManagers,
  listInvites,
} from "@/lib/actions/registry";
import { CategoryManager } from "@/components/category-manager";
import { ProfileListingField } from "@/components/profile-listing-field";
import { StoreRegistriesCard } from "@/components/store-registries-card";
import { parseRetailerRegistries } from "@/lib/retailers";
import type { PaymentMethods, PersonalEventType, RegistryType } from "@/lib/types";
import { copyFor } from "@/lib/registry-copy";

interface Manager {
  id: string;
  userId: string;
  role: string;
  name: string;
  email: string;
  createdAt: string;
}

interface Invite {
  id: string;
  email: string | null;
  max_uses: number | null;
  use_count: number;
  expires_at: string;
  created_at: string;
}

export default function RegistrySettingsPage() {
  const router = useRouter();
  const params = useParams();
  const registryId = params.registryId as string;

  const [registry, setRegistry] = useState<{
    title: string;
    parent_names: string | null;
    honoree_names: string | null;
    event_date: string | null;
    description: string | null;
    is_public: boolean;
    listed_on_profile: boolean;
    slug: string;
    owner_id: string;
    registry_type: RegistryType;
    event_type: PersonalEventType | null;
    settings: { payment_methods?: PaymentMethods; shipping_address?: string; zip_code?: string; tax_enabled?: boolean };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);
  const [savingZip, setSavingZip] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [savingAddress, setSavingAddress] = useState(false);
  const [zipError, setZipError] = useState("");
  const [zipSuccess, setZipSuccess] = useState(false);
  const [addressError, setAddressError] = useState("");
  const [addressSuccess, setAddressSuccess] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string; sort_order: number }[]>([]);
  const [slugCopied, setSlugCopied] = useState(false);
  // Guests (anonymous sessions) have no profile page to list a registry on.
  const [hasProfile, setHasProfile] = useState(false);
  const [isPublicChoice, setIsPublicChoice] = useState(true);
  const [listedChoice, setListedChoice] = useState(false);

  // Manager state
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitingEmail, setInvitingEmail] = useState(false);
  const [inviteEmailError, setInviteEmailError] = useState("");
  const [inviteEmailSuccess, setInviteEmailSuccess] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [maxUses, setMaxUses] = useState<string>("1");

  const isOwner = currentUserId !== null && registry?.owner_id === currentUserId;

  const fetchManagerData = useCallback(async () => {
    const [managersResult, invitesResult] = await Promise.all([
      listManagers(registryId),
      listInvites(registryId),
    ]);
    setManagers(managersResult.managers);
    setInvites(invitesResult.invites);
  }, [registryId]);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const [{ data }, { data: cats }, { data: { user } }] = await Promise.all([
        supabase
          .from("registries")
          .select("title, parent_names, honoree_names, event_date, description, is_public, listed_on_profile, slug, owner_id, registry_type, event_type, settings")
          .eq("id", registryId)
          .single(),
        supabase
          .from("categories")
          .select("id, name, sort_order")
          .eq("registry_id", registryId)
          .order("sort_order"),
        supabase.auth.getUser(),
      ]);
      setRegistry(data);
      setIsPublicChoice(data?.is_public ?? true);
      setListedChoice(data?.listed_on_profile ?? false);
      setCategories(cats || []);
      setCurrentUserId(user?.id || null);
      setHasProfile(Boolean(user && !user.is_anonymous));
      setLoading(false);
    };
    fetchData();
    fetchManagerData();
  }, [registryId, fetchManagerData]);

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
      const honoreeNames =
        (formData.get("honoreeNames") as string) ||
        (formData.get("parentNames") as string) ||
        "";
      const savedIsPublic = formData.get("isPublic") === "true";
      setRegistry({
        ...registry,
        title: formData.get("title") as string,
        parent_names: honoreeNames || null,
        honoree_names: honoreeNames || null,
        event_date: (formData.get("eventDate") as string) || null,
        description: (formData.get("description") as string) || null,
        is_public: savedIsPublic,
        listed_on_profile: isOwner ? listedChoice : registry.listed_on_profile,
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
    } else if (registry) {
      setPaymentSuccess(true);
      setTimeout(() => setPaymentSuccess(false), 2000);
      setRegistry({
        ...registry,
        settings: {
          ...registry.settings,
          payment_methods: {
            venmo: (formData.get("venmo") as string)?.trim() || undefined,
            paypal: (formData.get("paypal") as string)?.trim() || undefined,
            zelle: (formData.get("zelle") as string)?.trim() || undefined,
          },
        },
      });
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
    } else if (registry) {
      setZipSuccess(true);
      setTimeout(() => setZipSuccess(false), 2000);
      setRegistry({
        ...registry,
        settings: {
          ...registry.settings,
          zip_code: (formData.get("zipCode") as string)?.trim() || undefined,
          tax_enabled: formData.get("taxEnabled") === "true",
        },
      });
    }
    setSavingZip(false);
  };

  const handleSaveAddress = async (formData: FormData) => {
    setSavingAddress(true);
    setAddressError("");
    setAddressSuccess(false);
    const address = formData.get("shippingAddress") as string;
    const result = await updateShippingAddress(registryId, address);
    if (result?.error) {
      setAddressError(result.error);
    } else if (registry) {
      setAddressSuccess(true);
      setTimeout(() => setAddressSuccess(false), 2000);
      setRegistry({
        ...registry,
        settings: {
          ...registry.settings,
          shipping_address: address.trim() || undefined,
        },
      });
    }
    setSavingAddress(false);
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

  const handleInviteByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInvitingEmail(true);
    setInviteEmailError("");
    setInviteEmailSuccess(false);
    const result = await inviteManagerByEmail(registryId, inviteEmail.trim());
    if (result.error) {
      setInviteEmailError(result.error);
    } else {
      setInviteEmailSuccess(true);
      setInviteEmail("");
      setTimeout(() => setInviteEmailSuccess(false), 3000);
      fetchManagerData();
    }
    setInvitingEmail(false);
  };

  const handleGenerateLink = async () => {
    setGeneratingLink(true);
    setGeneratedLink("");
    const uses = maxUses === "unlimited" ? null : parseInt(maxUses);
    const result = await generateInviteLink(registryId, uses);
    if (result.error) {
      setInviteEmailError(result.error);
    } else if (result.token) {
      const url = `${window.location.origin}/invite/${result.token}`;
      setGeneratedLink(url);
      fetchManagerData();
    }
    setGeneratingLink(false);
  };

  const handleRemoveManager = async (managerId: string) => {
    if (!confirm("Remove this manager? They will lose access to the registry.")) return;
    const result = await removeManager(registryId, managerId);
    if (result.error) {
      alert(result.error);
    } else {
      fetchManagerData();
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm("Revoke this invite? The link will stop working.")) return;
    const result = await revokeInvite(inviteId, registryId);
    if (result.error) {
      alert(result.error);
    } else {
      fetchManagerData();
    }
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
          <Link href={`/dashboard/registry/${registryId}`} aria-label="Back to registry">
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
          {/* onSubmit, not action: React resets a form after its action runs, which
              would put the listing checkbox back to its old value and unlist the
              registry on the next save. */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave(new FormData(e.currentTarget));
            }}
            className="space-y-4"
          >
            <Input
              label="Title"
              name="title"
              defaultValue={registry.title}
              isRequired
            />

            <Input
              label={copyFor({ registryType: registry.registry_type, eventType: registry.event_type }).honoreeLabel}
              name="honoreeNames"
              placeholder={copyFor({ registryType: registry.registry_type, eventType: registry.event_type }).honoreePlaceholder}
              defaultValue={registry.honoree_names || registry.parent_names || ""}
              hint="The name shown to gift givers and in email notifications."
            />

            <Input
              label={copyFor({ registryType: registry.registry_type, eventType: registry.event_type }).eventDateLabel}
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
              <p className="text-xs text-tertiary">Anyone with the share link can open your registry either way. This controls search engines, and who sees it on your profile.</p>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="isPublic"
                    value="true"
                    defaultChecked={registry.is_public}
                    onChange={() => setIsPublicChoice(true)}
                  />
                  <span className="text-sm">Public — searchable by search engines</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="isPublic"
                    value="false"
                    defaultChecked={!registry.is_public}
                    onChange={() => setIsPublicChoice(false)}
                  />
                  <span className="text-sm">Private — hidden from search engines, and only followers you approve see it on your profile</span>
                </label>
              </div>
            </div>

            {isOwner && hasProfile && (
              <ProfileListingField
                isPublic={isPublicChoice}
                isSelected={listedChoice}
                onChange={setListedChoice}
                hasShippingAddress={Boolean(registry.settings?.shipping_address)}
              />
            )}

            <div className="space-y-1">
              <span className="text-sm font-medium text-secondary">Share URL</span>
              <div className="flex items-center gap-4">
                <p className="text-sm text-tertiary font-mono">
                  /r/{registry.slug}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/r/${registry.slug}`);
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

            {error && <p className="text-sm text-error-primary">{error}</p>}

            <Button type="submit" disabled={saving}>
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

            <Button type="submit" disabled={savingZip}>
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

            <Button type="submit" disabled={savingPayment}>
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

      <Card>
        <CardHeader>
          <CardTitle>Shipping Address</CardTitle>
          <CardDescription>
            Share your shipping address with gift givers so they know where to send gifts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSaveAddress} className="space-y-4">
            <TextArea
              label="Address"
              name="shippingAddress"
              placeholder={"Jane & John Doe\n123 Main Street, Apt 4B\nNew York, NY 10001"}
              defaultValue={registry.settings?.shipping_address || ""}
              rows={3}
            />

            {addressError && (
              <p className="text-sm text-error-primary">{addressError}</p>
            )}

            <Button type="submit" disabled={savingAddress}>
              {savingAddress
                ? "Saving..."
                : addressSuccess
                  ? "Saved!"
                  : "Save address"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Separator className="my-8" />

      {registry.registry_type === "baby" && (
        <>
          {/* The add-item dialog links here when a pasted link is from a store
              the owner hasn't linked yet. */}
          <div id="store-registries" className="scroll-mt-20">
            <StoreRegistriesCard
              registryId={registryId}
              initialRegistries={parseRetailerRegistries(registry.settings)}
            />
          </div>

          <Separator className="my-8" />
        </>
      )}

      {/* Managers Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Managers
          </CardTitle>
          <CardDescription>
            Invite others to help manage this registry. Managers can add/edit items, view gift activity, and manage categories.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current managers list */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-secondary">Current managers</h4>
            <div className="space-y-2">
              {managers.map((m) => (
                <div key={m.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{m.name}</p>
                      <p className="text-xs text-tertiary truncate">{m.email}</p>
                    </div>
                    <Badge variant={m.role === "owner" ? "default" : "secondary"}>
                      {m.role === "owner" ? "Owner" : "Manager"}
                    </Badge>
                  </div>
                  {isOwner && m.role !== "owner" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveManager(m.id)}
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

          {/* Invite by email */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-secondary flex items-center gap-1.5">
              <Mail className="h-4 w-4" />
              Invite by email
            </h4>
            <form onSubmit={handleInviteByEmail} className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="coparent@example.com"
                  value={inviteEmail}
                  onChange={(val) => setInviteEmail(val)}
                />
              </div>
              <Button
                type="submit"
                disabled={invitingEmail || !inviteEmail.trim()}
                className="shrink-0"
              >
                {invitingEmail ? "Sending..." : inviteEmailSuccess ? "Sent!" : "Send Invite"}
              </Button>
            </form>
            {inviteEmailError && (
              <p className="text-sm text-error-primary">{inviteEmailError}</p>
            )}
          </div>

          <Separator />

          {/* Generate invite link */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-secondary flex items-center gap-1.5">
              <LinkIcon className="h-4 w-4" />
              Generate invite link
            </h4>
            <div className="flex gap-2 items-end">
              <div>
                <label htmlFor="invite-max-uses" className="text-xs text-tertiary">Max uses</label>
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
              <Button
                onClick={handleGenerateLink}
                disabled={generatingLink}
                variant="outline"
                className="shrink-0"
              >
                {generatingLink ? "Generating..." : "Generate"}
              </Button>
            </div>
            {generatedLink && (
              <div className="flex items-center gap-2 mt-2 rounded-md border px-3 py-2 bg-muted/50">
                <code className="text-xs break-all flex-1">{generatedLink}</code>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedLink);
                    setLinkCopied(true);
                    setTimeout(() => setLinkCopied(false), 2000);
                  }}
                  className="text-tertiary hover:text-secondary transition-colors shrink-0"
                >
                  {linkCopied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Active invites */}
          {invites.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-secondary">Active invites</h4>
                <div className="space-y-2">
                  {invites.map((inv) => {
                    const expired = new Date(inv.expires_at) < new Date();
                    const fullyUsed = inv.max_uses !== null && inv.use_count >= inv.max_uses;
                    return (
                      <div
                        key={inv.id}
                        className={`flex items-center justify-between rounded-md border px-3 py-2 ${expired || fullyUsed ? "opacity-50" : ""}`}
                      >
                        <div className="min-w-0">
                          <p className="text-sm truncate">
                            {inv.email ? inv.email : "Link invite"}
                          </p>
                          <p className="text-xs text-tertiary">
                            {inv.use_count}{inv.max_uses !== null ? `/${inv.max_uses}` : ""} uses
                            {expired && " · Expired"}
                            {fullyUsed && !expired && " · Fully used"}
                            {!expired && !fullyUsed && ` · Expires ${new Date(inv.expires_at).toLocaleDateString()}`}
                          </p>
                        </div>
                        {isOwner && !expired && !fullyUsed && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevokeInvite(inv.id)}
                            className="text-error-primary hover:text-error-primary shrink-0"
                          >
                            Revoke
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone - only visible to owners */}
      {isOwner && (
        <>
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
        </>
      )}
    </div>
  );
}
