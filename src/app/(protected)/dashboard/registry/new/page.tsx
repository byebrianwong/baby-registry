"use client";

import { Baby } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { createRegistry } from "@/lib/actions/registry";
import { useState } from "react";

export default function NewRegistryPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isPublic, setIsPublic] = useState(true);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError("");
    const result = await createRegistry(formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto max-w-xl px-4 py-8">
      <Card>
        <CardContent className="p-4">
          <form action={handleSubmit} className="space-y-6">
            {/* Header */}
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#4f7e60]/10">
                <Baby className="h-6 w-6 text-[#4f7e60]" />
              </div>
              <h1 className="text-2xl font-medium text-primary">
                Create Your Registry
              </h1>
              <p className="text-xs text-tertiary">
                Set up your baby registry in just a few steps
              </p>
            </div>

            {/* General Information */}
            <div className="space-y-4">
              <h2 className="text-lg font-medium">General Information</h2>

              <Input
                label="Registry Title"
                name="title"
                placeholder="The Smith Family Baby Registry"
                isRequired
              />

              <Input
                label="Due Date (optional)"
                name="eventDate"
                type="date"
                hint="Used for personalized recommendations and reminders"
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
                  All registries are accessible via their share link. This setting controls whether search engines can find your registry.
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
                    label={<span className="font-normal">Private — only accessible with link</span>}
                  />
                </div>
              </div>
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
