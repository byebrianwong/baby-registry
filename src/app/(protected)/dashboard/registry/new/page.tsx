"use client";

import { Baby } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Baby className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Create Your Registry</CardTitle>
          <CardDescription>
            Set up your baby registry in just a few steps
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Registry Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="The Smith Family Baby Registry"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="eventDate">Due Date (optional)</Label>
              <Input
                id="eventDate"
                name="eventDate"
                type="date"
              />
              <p className="text-xs text-muted-foreground">
                Used for personalized recommendations and reminders
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Welcome Message (optional)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="We're so excited to welcome our little one! Thank you for being part of this journey."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Displayed on your public registry page
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create Registry"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
