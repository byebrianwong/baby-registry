"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/base/input/input";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { CopyLinkButton } from "@/components/copy-link-button";
import { FollowLists } from "@/components/follow-lists";
import { removeProfile, saveProfile, setRegistryListed } from "@/lib/actions/profile";
import { occasionLabel } from "@/lib/registry-copy";
import { normalizeUsername } from "@/lib/username";
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
  removeAction = removeProfile,
  listAction = setRegistryListed,
  follows,
}: {
  profile: {
    username: string | null;
    full_name: string | null;
    discoverable?: boolean;
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
  removeAction?: typeof removeProfile;
  listAction?: typeof setRegistryListed;
}) {
  const [username, setUsername] = useState(profile.username ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState("");

  const hasProfile = Boolean(profile.username);
  // New profiles start out findable; existing ones keep what they chose.
  const [discoverable, setDiscoverable] = useState(hasProfile ? Boolean(profile.discoverable) : true);
  const [emailRequests, setEmailRequests] = useState(profile.email_follow_requests ?? true);
  const previewUsername = normalizeUsername(username) || "your-username";

  const handleSave = async (formData: FormData) => {
    setSaving(true);
    setError("");
    setSaved(false);
    const result = await saveAction(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      if (result?.username) setUsername(result.username);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  const handleRemove = async () => {
    if (
      !confirm(
        "Turn off your public profile? Your profile link will stop working, and your followers and the people you follow will be removed. Registry share links keep working.",
      )
    ) {
      return;
    }
    setRemoving(true);
    setError("");
    const result = await removeAction();
    if (result?.error) {
      setError(result.error);
    } else {
      setUsername("");
    }
    setRemoving(false);
  };

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard" aria-label="Back to dashboard">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Account</h1>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Public profile</CardTitle>
            <CardDescription>
              {hasProfile
                ? "Anyone with your link can see your name and the registries you choose below."
                : "Get one link to all your registries. Nobody can find you until you claim a username."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* onSubmit, not action: React resets a form after its action runs, which
                would clear the username field. */}
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
                defaultValue={profile.full_name ?? ""}
                hint="Shown on your profile"
                isRequired
              />
              <Input
                label="Username"
                name="username"
                placeholder="jane-doe"
                value={username}
                onChange={setUsername}
                hint={
                  hasProfile
                    ? `/u/${previewUsername} (changing this breaks links you've already shared)`
                    : `/u/${previewUsername}`
                }
                isRequired
              />
              <input type="hidden" name="discoverable" value={discoverable ? "true" : "false"} />
              <Checkbox
                isSelected={discoverable}
                onChange={setDiscoverable}
                label="Show me in people search"
                hint="People signed in to Regibee can find you by name or username."
              />
              <input type="hidden" name="emailFollowRequests" value={emailRequests ? "true" : "false"} />
              <Checkbox
                isSelected={emailRequests}
                onChange={setEmailRequests}
                label="Email me when someone asks to follow me"
                hint="At most one email per person per day."
              />
              {error && <p className="text-sm text-error-primary">{error}</p>}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="submit"
                  disabled={saving}
                >
                  {saving ? "Saving..." : hasProfile ? "Save" : "Claim username"}
                </Button>
                {saved && (
                  <span className="inline-flex items-center gap-1 text-sm text-tertiary">
                    <Check className="h-4 w-4" />
                    Saved
                  </span>
                )}
              </div>
            </form>

            {profile.username && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-secondary pt-4">
                <CopyLinkButton path={`/u/${profile.username}`} />
                <Button variant="outline" asChild>
                  <Link href={`/u/${profile.username}`}>View profile</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Requests come first: the dashboard notice links straight here. */}
        {hasProfile && follows && (
          <div id="follows" className="scroll-mt-20 space-y-6">
            <FollowLists
              requests={follows.requests}
              followers={follows.followers}
              following={follows.following}
              blocked={follows.blocked}
            />
          </div>
        )}

        {hasProfile && (
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
        )}

        {hasProfile && (
          <Card>
            <CardHeader>
              <CardTitle>Turn off public profile</CardTitle>
              <CardDescription>
                Removes your profile page, frees up your username, and removes your followers and
                the people you follow. Registry share links keep working.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={handleRemove} disabled={removing}>
                {removing ? "Turning off..." : "Turn off profile"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
