"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/base/input/input";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { saveProfile } from "@/lib/actions/profile";
import { normalizeUsername, suggestUsername } from "@/lib/username";
import { Logo } from "@/components/logo";

/**
 * The step right after sign-up. A username is what makes an account findable,
 * so it can be skipped, and the dashboard and Account page offer it again.
 */
export function ChooseUsername({
  fullName,
  next,
  saveAction = saveProfile,
}: {
  /** The name from sign-up. Empty only if sign-up didn't save one. */
  fullName: string;
  /** Where to go after saving or skipping. */
  next: string;
  saveAction?: typeof saveProfile;
}) {
  const router = useRouter();
  const [name, setName] = useState(fullName);
  const [username, setUsername] = useState(() => suggestUsername(fullName));
  const [discoverable, setDiscoverable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const previewUsername = normalizeUsername(username) || "your-username";

  const handleSave = async (formData: FormData) => {
    setSaving(true);
    setError("");
    const result = await saveAction(formData);
    if (result?.error) {
      setError(result.error);
      setSaving(false);
      return;
    }
    router.push(next);
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link href="/dashboard" className="mx-auto mb-4 flex items-center gap-2 font-semibold">
            <Logo size="lg" />
          </Link>
          <CardTitle className="text-2xl">Choose a username</CardTitle>
          <CardDescription>
            It&apos;s your public profile link. People can ask to follow you, and you can follow them.
            Your registries stay off your profile until you add them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* onSubmit, not action: React resets a form after its action runs,
              which would clear the fields when saving fails. */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSave(new FormData(e.currentTarget));
            }}
            className="space-y-4"
          >
            {fullName ? (
              <input type="hidden" name="fullName" value={name} />
            ) : (
              <Input
                label="Name"
                name="fullName"
                value={name}
                onChange={setName}
                hint="Shown on your profile"
                isRequired
              />
            )}
            <Input
              label="Username"
              name="username"
              placeholder="jane-doe"
              value={username}
              onChange={setUsername}
              hint={`/u/${previewUsername}`}
              isRequired
            />
            <input type="hidden" name="discoverable" value={discoverable ? "true" : "false"} />
            <Checkbox
              isSelected={discoverable}
              onChange={setDiscoverable}
              label="Show me in people search"
              hint="People signed in to Regibee can find you by name or username."
            />
            {error && <p className="text-sm text-error-primary">{error}</p>}
            <Button
              type="submit"
              className="w-full"
              disabled={saving}
            >
              {saving ? "Saving..." : "Claim username"}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-tertiary">
            <Link href={next} className="font-medium text-secondary underline-offset-4 hover:underline">
              Skip for now
            </Link>
            <span className="block">You can claim one later from your account.</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
