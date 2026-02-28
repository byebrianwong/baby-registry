"use client";

import { Baby } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createRegistry } from "@/lib/actions/registry";
import { useState } from "react";

export default function NewRegistryPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-600/10">
            <Baby className="h-6 w-6 text-brand-600" />
          </div>
          <CardTitle className="text-2xl">Create Your Registry</CardTitle>
          <CardDescription>
            Set up your baby registry in just a few steps
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-6">
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
              label="Welcome Message (optional)"
              name="description"
              placeholder="We're so excited to welcome our little one! Thank you for being part of this journey."
              rows={3}
              hint="Displayed on your public registry page"
            />

            {error && <p className="text-sm text-error-primary">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create Registry"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
