import Link from "next/link";
import type { Metadata } from "next";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatEventDate } from "@/lib/events";
import { getSessionUser } from "@/lib/viewer";
import { AcceptHostInviteButton } from "./accept-host-invite-button";

export const metadata: Metadata = { title: "Co-host an event | Regibee", robots: { index: false, follow: false } };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">{children}</Card>
    </div>
  );
}

/** Where someone lands from a co-host invitation, by email or a shared link. */
export default async function HostInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { data: invite } = await supabaseAdmin
    .from("event_host_invites")
    .select("event_id, invited_by, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!invite || Date.parse(invite.expires_at) < Date.now()) {
    return (
      <Shell>
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <AlertCircle aria-hidden="true" className="mb-2 size-12 text-error-primary" />
          <h1 className="text-xl font-semibold">This invitation has expired</h1>
          <p className="text-tertiary">It may have been used already or taken back. Ask the host for a new one.</p>
          <Button asChild className="mt-4">
            <Link href="/dashboard">Go to your dashboard</Link>
          </Button>
        </CardContent>
      </Shell>
    );
  }

  const [{ data: event }, { data: inviter }, user] = await Promise.all([
    supabaseAdmin.from("events").select("title, event_date").eq("id", invite.event_id).maybeSingle(),
    supabaseAdmin.from("profiles").select("full_name").eq("id", invite.invited_by).maybeSingle(),
    getSessionUser(),
  ]);
  const eventTitle = event?.title ?? "an event";
  const inviterName = (inviter?.full_name as string | null)?.trim() || "Someone";
  const back = `/host-invite/${token}`;

  return (
    <Shell>
      <CardHeader className="text-center">
        <Link href={user && !user.is_anonymous ? "/dashboard" : "/"} className="mx-auto mb-4 flex items-center gap-2 font-semibold">
          <Logo size="lg" />
        </Link>
        <CardTitle className="text-2xl">Co-host {eventTitle}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-center">
        <p className="text-secondary">
          <strong>{inviterName}</strong> asked you to co-host <strong>{eventTitle}</strong>
          {event?.event_date ? ` on ${formatEventDate(event.event_date)}` : ""}.
        </p>
        <p className="text-sm text-tertiary">
          Co-hosts can edit the event, add guests, send invitations and reminders, see RSVPs and draw names.
        </p>
        {user && !user.is_anonymous ? (
          <AcceptHostInviteButton token={token} />
        ) : (
          <>
            <p className="text-sm text-tertiary">Sign in or make a free account to accept.</p>
            <div className="flex justify-center gap-3">
              <Button asChild>
                <Link href={`/login?redirect=${encodeURIComponent(back)}`}>Sign in</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href={`/signup?redirect=${encodeURIComponent(back)}`}>Create account</Link>
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Shell>
  );
}
