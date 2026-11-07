import Link from "next/link";
import { Baby, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { AcceptInviteButton } from "./accept-invite-button";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  // Fetch invite details using admin client (no RLS)
  const { data: invite } = await supabaseAdmin
    .from("registry_invites")
    .select("id, registry_id, email, max_uses, use_count, expires_at")
    .eq("token", token)
    .single();

  if (!invite) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12">
            <AlertCircle className="h-12 w-12 text-error-primary mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Invite</h2>
            <p className="text-tertiary text-center">
              This invite link is invalid or has been revoked.
            </p>
            <Button asChild className="mt-6">
              <Link href="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check expiry
  if (new Date(invite.expires_at) < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12">
            <AlertCircle className="h-12 w-12 text-error-primary mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invite Expired</h2>
            <p className="text-tertiary text-center">
              This invite link has expired. Please ask the registry owner for a new invite.
            </p>
            <Button asChild className="mt-6">
              <Link href="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check max uses
  if (invite.max_uses !== null && invite.use_count >= invite.max_uses) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-12">
            <AlertCircle className="h-12 w-12 text-error-primary mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invite Fully Used</h2>
            <p className="text-tertiary text-center">
              This invite link has reached its maximum number of uses.
            </p>
            <Button asChild className="mt-6">
              <Link href="/login">Go to Login</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get registry info
  const { data: registry } = await supabaseAdmin
    .from("registries")
    .select("title, parent_names")
    .eq("id", invite.registry_id)
    .single();

  const registryTitle = registry?.title || "a registry";
  const ownerName = registry?.parent_names || "Someone";

  // Check if user is logged in
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Not logged in — show invite info with login/signup links
    const redirectUrl = `/invite/${token}`;
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Link href="/" className="mx-auto flex items-center gap-2 font-semibold mb-4">
              <Baby className="h-6 w-6 text-brand-600" />
              <span className="font-display text-xl font-bold tracking-tight">Regibee</span>
            </Link>
            <CardTitle className="text-2xl">You&apos;re Invited!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-secondary">
              <strong>{ownerName}</strong> invited you to help manage{" "}
              <strong>{registryTitle}</strong>.
            </p>
            <p className="text-tertiary text-sm">
              Sign in or create an account to accept this invitation.
            </p>
            <div className="flex gap-3 justify-center mt-6">
              <Button asChild>
                <Link href={`/login?redirect=${encodeURIComponent(redirectUrl)}`}>
                  Sign In
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/signup?redirect=${encodeURIComponent(redirectUrl)}`}>
                  Create Account
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Logged in — show accept button
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {/* Guests have anonymous sessions and no registries, so their logo
              goes to the home page. */}
          <Link
            href={user.is_anonymous ? "/" : "/dashboard"}
            className="mx-auto flex items-center gap-2 font-semibold mb-4"
          >
            <Baby className="h-6 w-6 text-brand-600" />
            <span className="font-display text-xl font-bold tracking-tight">Regibee</span>
          </Link>
          <CardTitle className="text-2xl">You&apos;re Invited!</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-secondary">
            <strong>{ownerName}</strong> invited you to help manage{" "}
            <strong>{registryTitle}</strong>.
          </p>
          <p className="text-tertiary text-sm">
            As a manager, you&apos;ll be able to add and edit items, view gift
            activity, and help organize the registry.
          </p>
          <AcceptInviteButton token={token} />
        </CardContent>
      </Card>
    </div>
  );
}
