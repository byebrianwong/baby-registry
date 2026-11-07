"use client";

import { Baby, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { OccasionPicker } from "@/components/occasion-picker";
import { ProfileListingField } from "@/components/profile-listing-field";
import { createRegistry } from "@/lib/actions/registry";
import { copyFor } from "@/lib/registry-copy";
import type { PersonalEventType, RegistryType } from "@/lib/types";
import { createClient } from "@/utils/supabase/client";
import { useEffect, useMemo, useState } from "react";

export default function NewRegistryPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [registryType, setRegistryType] = useState<RegistryType>("baby");
  const [eventType, setEventType] = useState<PersonalEventType | "">("");
  const [username, setUsername] = useState<string | null | undefined>(undefined);
  const [listedChoice, setListedChoice] = useState<boolean | null>(null);

  // Personal registries are shown by default. Baby registries aren't, because
  // showing one on a profile could announce a pregnancy.
  const isListed = listedChoice ?? registryType === "personal";

  const chooseRegistryType = (type: RegistryType) => {
    setRegistryType(type);
    setListedChoice(null);
  };

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        setUsername(null);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();
      setUsername(data?.username ?? null);
    });
  }, []);

  const copy = useMemo(
    () =>
      copyFor({
        registryType,
        eventType: registryType === "personal" && eventType ? eventType : null,
      }),
    [registryType, eventType],
  );

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError("");
    const result = await createRegistry(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  const Icon = registryType === "baby" ? Baby : Gift;

  return (
    <div className="container mx-auto max-w-xl px-4 py-8">
      <Card>
        <CardContent className="p-4">
          <form action={handleSubmit} className="space-y-6">
            {/* Header */}
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#4f7e60]/10">
                <Icon className="h-6 w-6 text-[#4f7e60]" />
              </div>
              <h1 className="text-2xl font-medium text-primary">
                Create Your Registry
              </h1>
              <p className="text-xs text-tertiary">{copy.tagline}</p>
            </div>

            {/* Registry type picker */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-secondary">
                Registry type
              </span>
              <input type="hidden" name="registryType" value={registryType} />
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => chooseRegistryType("baby")}
                  className={`flex flex-col rounded-lg border p-3 text-left transition ${
                    registryType === "baby"
                      ? "border-[#004659] bg-[#004659]/5 ring-1 ring-[#004659]"
                      : "border-secondary hover:border-primary"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Baby className="h-4 w-4" />
                    <span className="font-medium">Baby</span>
                  </div>
                  <p className="mt-1 text-xs text-tertiary">
                    Baby shower, expecting a new arrival
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => chooseRegistryType("personal")}
                  className={`flex flex-col rounded-lg border p-3 text-left transition ${
                    registryType === "personal"
                      ? "border-[#004659] bg-[#004659]/5 ring-1 ring-[#004659]"
                      : "border-secondary hover:border-primary"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Gift className="h-4 w-4" />
                    <span className="font-medium">Personal</span>
                  </div>
                  <p className="mt-1 text-xs text-tertiary">
                    Birthday, Christmas, wedding, housewarming, more
                  </p>
                </button>
              </div>

              {registryType === "personal" && (
                <div className="pt-2">
                  <input type="hidden" name="eventType" value={eventType} />
                  <OccasionPicker
                    value={eventType}
                    onChange={setEventType}
                    hint="Changes the wording on your registry to fit the occasion. You can skip this."
                  />
                </div>
              )}
            </div>

            {/* General Information */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium">General Information</h2>

              <Input
                label="Registry Title"
                name="title"
                placeholder={copy.titlePlaceholder}
                isRequired
              />

              <Input
                label={`${copy.eventDateLabel} (optional)`}
                name="eventDate"
                type="date"
                hint={copy.eventDatePlaceholderHint}
              />

              <TextArea
                label="Welcome message to guests (optional)"
                name="description"
                placeholder="Enter a description..."
                rows={4}
                hint="Displayed on your public registry page"
              />

              <div className="space-y-2">
                <span className="text-sm font-medium text-secondary">Visibility</span>
                <p className="text-sm text-tertiary">
                  Anyone with the share link can open your registry either way. This controls search engines, and who sees it on your profile.
                </p>
                <input type="hidden" name="isPublic" value={isPublic ? "true" : "false"} />
                <div className="flex flex-col gap-2">
                  <Checkbox
                    isSelected={isPublic}
                    onChange={(checked) => { if (checked) setIsPublic(true); }}
                    label={<span className="font-normal">Public — searchable by search engines</span>}
                  />
                  <Checkbox
                    isSelected={!isPublic}
                    onChange={(checked) => { if (checked) setIsPublic(false); }}
                    label={<span className="font-normal">Private — hidden from search engines, and only followers you approve see it on your profile</span>}
                  />
                </div>
              </div>

              {username !== undefined && (
                <ProfileListingField
                  username={username}
                  isPublic={isPublic}
                  isSelected={isListed}
                  onChange={setListedChoice}
                />
              )}
            </div>

            {/* Location */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Location</h2>
              <p className="text-sm text-tertiary">
                Used to estimate sales tax on item prices when adding products you&apos;ve already purchased. You can edit this later in settings.
              </p>

              <Input
                label="Zip code"
                name="zipCode"
                placeholder="12345"
              />

              <Checkbox
                name="taxEnabled"
                value="true"
                label="Auto-add estimated sales tax to prices"
              />
            </div>

            {/* Payment methods */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium">Payment methods</h2>
              <p className="text-sm text-tertiary">
                Add your payment info so gift givers can send you money for cash funds and items you&apos;ve already purchased.
              </p>

              <Input
                label="Venmo"
                name="venmo"
                placeholder="@your-venmo"
              />

              <Input
                label="PayPal"
                name="paypal"
                placeholder="you@email.com or PayPal.me link"
              />

              <Input
                label="Zelle"
                name="zelle"
                placeholder="you@email.com or phone number"
              />
            </div>

            {error && <p className="text-sm text-error-primary">{error}</p>}

            <Button
              type="submit"
              className="w-full !bg-[#004659] hover:!bg-[#003847] !ring-[#004659] !text-white"
              disabled={loading}
            >
              {loading ? "Creating..." : "Create Registry"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
