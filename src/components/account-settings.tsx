"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/base/input/input";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { CopyLinkButton } from "@/components/copy-link-button";
import { removeProfile, saveProfile, setRegistryListed } from "@/lib/actions/profile";
import { occasionLabel } from "@/lib/registry-copy";
import { normalizeUsername } from "@/lib/username";
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

  let hint: React.ReactNode = occasionLabel(registry.registry_type, registry.event_type);
  if (!registry.is_public) {
    hint = (
      <>
        Private registries can&apos;t be shown.{" "}
        <Link
          href={`/dashboard/registry/${registry.id}/settings`}
          className="font-medium text-[#004659] hover:underline"
        >
          Change visibility
        </Link>
      </>
    );
  } else if (listed && registry.has_shipping_address) {
    hint = "Anyone who reserves a gift can see your shipping address.";
  }

  return (
    <div>
      <Checkbox
        isSelected={registry.is_public && listed}
        isDisabled={!registry.is_public || saving}
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
}: {
  profile: { username: string | null; full_name: string | null };
  registries: AccountRegistry[];
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
        "Turn off your public profile? Your profile link will stop working and your registries will be hidden from it. Registry share links keep working.",
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
              {error && <p className="text-sm text-error-primary">{error}</p>}
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="submit"
                  className="!bg-[#004659] hover:!bg-[#003847] !ring-[#004659] !text-white"
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

        {hasProfile && (
          <Card>
            <CardHeader>
              <CardTitle>Registries on your profile</CardTitle>
              <CardDescription>
                Only the ones you check appear on your profile. Registries you help manage for
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
                Removes your profile page and frees up your username. Registry share links keep
                working.
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
