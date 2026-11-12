"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/base/input/input";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { CopyLinkButton } from "@/components/copy-link-button";
import { DeleteAccountCard } from "@/components/delete-account-card";
import { FollowLists } from "@/components/follow-lists";
import { saveProfile, setRegistryListed } from "@/lib/actions/profile";
import { occasionLabel } from "@/lib/registry-copy";
import { profilePath } from "@/lib/profile-link";
import type { FollowPerson, PersonSummary } from "@/lib/follows";
import type { PersonalEventType, RegistryType } from "@/lib/types";

export interface AccountRegistry {
  id: string;
  title: string;
  is_public: boolean;
  listed_on_profile: boolean;
  has_shipping_address: boolean;
  registry_type: RegistryType;
  event_type: PersonalEventType | null;
}

function RegistryListingRow({
  registry,
  action,
}: {
  registry: AccountRegistry;
  action: typeof setRegistryListed;
}) {
  const [listed, setListed] = useState(registry.listed_on_profile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = async (next: boolean) => {
    setListed(next);
    setSaving(true);
    setError("");
    const result = await action(registry.id, next);
    if (result?.error) {
      setListed(!next);
      setError(result.error);
    }
    setSaving(false);
  };

  let hint = registry.is_public
    ? `${occasionLabel(registry.registry_type, registry.event_type)} · Public`
    : "Private: only followers you approve see it";
  if (listed && registry.has_shipping_address) {
    hint += ". Anyone who reserves a gift can see your shipping address.";
  }

  return (
    <div>
      <Checkbox
        isSelected={listed}
        isDisabled={saving}
        onChange={handleChange}
        label={registry.title}
        hint={hint}
      />
      {error && <p className="mt-1 text-sm text-error-primary">{error}</p>}
    </div>
  );
}

export function AccountSettings({
  profile,
  registries,
  saveAction = saveProfile,
  listAction = setRegistryListed,
  follows,
  followActions,
  deleteAccountActions,
  basePath = "",
}: {
  profile: {
    public_id: string;
    full_name: string | null;
    discoverable?: boolean;
    findable_by_email?: boolean;
    email_follow_requests?: boolean;
  };
  registries: AccountRegistry[];
  follows?: {
    requests: FollowPerson[];
    followers: FollowPerson[];
    following: FollowPerson[];
    blocked?: PersonSummary[];
  };
  saveAction?: typeof saveProfile;
  listAction?: typeof setRegistryListed;
  /** Stand-ins for the follow lists' server actions. The demo passes them. */
  followActions?: Pick<
    React.ComponentProps<typeof FollowLists>,
    "approveAction" | "removeAction" | "cancelAction" | "blockAction" | "unblockAction"
  >;
  /** Stand-ins for the account API in the Delete account card. The demo passes them. */
  deleteAccountActions?: React.ComponentProps<typeof DeleteAccountCard>;
  /** Put in front of every link. The demo passes "/demo". */
  basePath?: string;
}) {
  const [savedName, setSavedName] = useState(profile.full_name);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [discoverable, setDiscoverable] = useState(Boolean(profile.discoverable));
  const [findableByEmail, setFindableByEmail] = useState(Boolean(profile.findable_by_email));
  const [emailRequests, setEmailRequests] = useState(profile.email_follow_requests ?? true);

  // The link has the name in it, so it follows the saved name.
  const link = `${basePath}${profilePath({ public_id: profile.public_id, full_name: savedName })}`;

  const handleSave = async (formData: FormData) => {
    setSaving(true);
    setError("");
    setSaved(false);
    const result = await saveAction(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      setSavedName(((formData.get("fullName") as string) || "").trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`${basePath}/dashboard`} aria-label="Back to dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Account</h1>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Your profile</CardTitle>
            <CardDescription>
              One link to all the registries you choose below. Anyone with the link can see your name
              and those registries.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* onSubmit, not action: React resets a form after its action runs, which
                would put the checkboxes back. */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSave(new FormData(e.currentTarget));
              }}
              className="space-y-4"
            >
              <Input
                label="Name"
                name="fullName"
                autoComplete="name"
                defaultValue={profile.full_name ?? ""}
                hint="Shown on your profile, and to people you ask to follow"
                isRequired
              />
              <input type="hidden" name="discoverable" value={discoverable ? "true" : "false"} />
              <Checkbox
                isSelected={discoverable}
                onChange={setDiscoverable}
                label="Show me in people search"
                hint="People signed in to Regibee can find you by name."
              />
              <input type="hidden" name="findableByEmail" value={findableByEmail ? "true" : "false"} />
              <Checkbox
                isSelected={findableByEmail}
                onChange={setFindableByEmail}
                label="Let people find me by my email address"
                hint="Only someone who types your whole email address finds you this way. Your email is never shown."
              />
              <input type="hidden" name="emailFollowRequests" value={emailRequests ? "true" : "false"} />
              <Checkbox
                isSelected={emailRequests}
                onChange={setEmailRequests}
                label="Email me when someone asks to follow me"
                hint="Includes invites sent to your email address. At most one email per person per day."
              />
              {error && <p className="text-sm text-error-primary">{error}</p>}
              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
                {saved && (
                  <span className="inline-flex items-center gap-1 text-sm text-tertiary">
                    <Check className="h-4 w-4" />
                    Saved
                  </span>
                )}
              </div>
            </form>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-secondary pt-4">
              <CopyLinkButton path={link} />
              <Button variant="outline" asChild>
                <Link href={link}>View profile</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Requests come first: the dashboard notice links straight here. */}
        {follows && (
          <div id="follows" className="scroll-mt-20 space-y-6">
            <FollowLists
              requests={follows.requests}
              followers={follows.followers}
              following={follows.following}
              blocked={follows.blocked}
              basePath={basePath}
              {...followActions}
            />
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Registries on your profile</CardTitle>
            <CardDescription>
              Only the ones you check appear. Anyone with your link sees the public ones;
              private ones only show to followers you approve. Registries you help manage for
              someone else aren&apos;t included.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {registries.length === 0 ? (
              <p className="text-sm text-tertiary">You don&apos;t own any registries yet.</p>
            ) : (
              <div className="space-y-4">
                {registries.map((registry) => (
                  <RegistryListingRow key={registry.id} registry={registry} action={listAction} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <DeleteAccountCard {...deleteAccountActions} />
      </div>
    </div>
  );
}
