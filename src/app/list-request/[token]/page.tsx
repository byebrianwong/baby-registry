import Link from "next/link";
import type { Metadata } from "next";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/logo";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { formatEventDate, type EventType } from "@/lib/events";
import { occasionFor } from "@/lib/occasions";
import { getSessionUser } from "@/lib/viewer";
import { MakeListButton } from "./make-list-button";

export const metadata: Metadata = { title: "Make your list | Regibee", robots: { index: false, follow: false } };

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">{children}</Card>
    </div>
  );
}

/**
 * Where the person an event is for lands from the host's emailed request to
 * make a gift list (see startPlan and acceptListRequest).
 */
export default async function ListRequestPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { data: request } = await supabaseAdmin
    .from("event_list_requests")
    .select("event_id, requested_by, name, registry_id, fulfilled_at")
    .eq("token", token)
    .maybeSingle();
  const { data: event } = request
    ? await supabaseAdmin.from("events").select("title, event_date, event_type, slug").eq("id", request.event_id).maybeSingle()
    : { data: null };

  if (!request || !event) {
    return (
      <Shell>
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <AlertCircle aria-hidden="true" className="mb-2 size-12 text-error-primary" />
          <h1 className="text-xl font-semibold">This link doesn&apos;t work anymore</h1>
          <p className="text-tertiary">The event may have been deleted. Ask the host to send it again.</p>
          <Button asChild className="mt-4">
            <Link href="/dashboard">Go to your dashboard</Link>
          </Button>
        </CardContent>
      </Shell>
    );
  }

  const [{ data: host }, user] = await Promise.all([
    request.requested_by
      ? supabaseAdmin.from("profiles").select("full_name").eq("id", request.requested_by).maybeSingle()
      : Promise.resolve({ data: null }),
    getSessionUser(),
  ]);
  const hostName = (host?.full_name as string | null)?.trim() || "Your host";
  const noun = occasionFor(event.event_type as EventType).list.noun;
  const signedIn = Boolean(user && !user.is_anonymous);
  const back = `/list-request/${token}`;

  return (
    <Shell>
      <CardHeader className="text-center">
        <Link href={signedIn ? "/dashboard" : "/"} className="mx-auto mb-4 flex items-center gap-2 font-semibold">
          <Logo size="lg" />
        </Link>
        <CardTitle className="text-2xl">Make your {noun}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-center">
        <p className="text-secondary">
          <strong>{hostName}</strong> is planning <strong>{event.title}</strong>
          {event.event_date ? ` on ${formatEventDate(event.event_date)}` : ""} and asked you to make a {noun}.
        </p>
        {request.fulfilled_at ? (
          <>
            <p className="text-sm text-tertiary">A list was already made from this link, and it&apos;s on the invitation.</p>
            <Button asChild>
              <Link href={`/e/${event.slug}`}>See the invitation</Link>
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-tertiary">
              It&apos;s yours: add things from any store, and guests reserve them without an account. It&apos;s linked
              to the invitation as soon as you make it. {hostName} can&apos;t change it.
            </p>
            {signedIn ? (
              <MakeListButton token={token} label={`Make my ${noun}`} />
            ) : (
              <>
                <p className="text-sm text-tertiary">Sign in or make a free account to start.</p>
                <div className="flex justify-center gap-3">
                  <Button asChild>
                    <Link href={`/signup?redirect=${encodeURIComponent(back)}`}>Create account</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link href={`/login?redirect=${encodeURIComponent(back)}`}>Sign in</Link>
                  </Button>
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Shell>
  );
}
