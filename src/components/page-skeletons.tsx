import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Placeholders shown while a page's data loads (each route's loading.tsx).
// Each one copies the real page's heading and spacing, so nothing jumps when
// the real page replaces it. If you change a page's heading, change it here too.
// The dashboard and Following skeletons show under the dashboard tabs, which
// stay on screen, so they have only a screen-reader heading.

function LoadingMessage({ children }: { children: string }) {
  return (
    <span role="status" className="sr-only">
      {children}
    </span>
  );
}

/** Matches src/components/dashboard-registry-card.tsx. */
function RegistryCardSkeleton() {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="flex h-16 items-center justify-between bg-secondary px-5">
        <Skeleton className="size-9 rounded-full" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
      <div className="space-y-4 p-5">
        <div className="space-y-2">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div>
          <div className="mb-2 flex justify-between">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-4 w-8" />
          </div>
          <Skeleton className="h-2 w-full rounded-full" />
        </div>
        <div className="flex justify-between">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1 rounded-full" />
          <Skeleton className="h-9 w-10 rounded-full" />
        </div>
      </div>
    </Card>
  );
}

/** Matches src/app/(protected)/dashboard/(tabs)/(overview)/page.tsx. */
export function DashboardSkeleton() {
  return (
    <div className="container mx-auto px-4 pt-6 pb-8" aria-busy="true">
      <LoadingMessage>Loading your registries</LoadingMessage>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="sr-only">My Registries</h1>
          <p className="text-tertiary">Manage your registries and track gifts</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/new">
            <span className="inline-flex items-center gap-1.5">
              <Plus className="h-4 w-4 shrink-0" />
              New
            </span>
          </Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <RegistryCardSkeleton />
        <RegistryCardSkeleton />
        <RegistryCardSkeleton />
      </div>
    </div>
  );
}

/** Matches src/components/event-card.tsx. */
function EventCardSkeleton() {
  return (
    <Card className="gap-0 overflow-hidden py-0">
      <div className="h-32 bg-secondary" />
      <div className="space-y-4 p-5">
        <div className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-4 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1 rounded-full" />
          <Skeleton className="h-9 w-16 rounded-full" />
        </div>
      </div>
    </Card>
  );
}

/** Matches src/components/events-overview.tsx. */
export function EventsSkeleton() {
  return (
    <div className="container mx-auto px-4 pt-6 pb-8" aria-busy="true">
      <LoadingMessage>Loading your events</LoadingMessage>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="sr-only">Events</h1>
          <p className="text-tertiary">Send invitations and track RSVPs</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/new">
            <span className="inline-flex items-center gap-1.5">
              <Plus className="h-4 w-4 shrink-0" />
              New
            </span>
          </Link>
        </Button>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <EventCardSkeleton />
        <EventCardSkeleton />
        <EventCardSkeleton />
      </div>
    </div>
  );
}

function ProfileRegistryCardSkeleton() {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-secondary bg-primary p-4 shadow-sm">
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3.5 w-1/3" />
      </div>
    </div>
  );
}

/** Matches FollowingFeed in src/components/following-feed.tsx. */
export function FollowingSkeleton() {
  return (
    <div className="container mx-auto px-4 pt-6 pb-8" aria-busy="true">
      <div className="max-w-2xl">
        <LoadingMessage>Loading the registries you follow</LoadingMessage>
        <h1 className="sr-only">Following</h1>
        <p className="text-tertiary">Registries from people who&apos;ve approved your follow.</p>

        {/* The people search box */}
        <div className="mt-6 space-y-1.5">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>

        <section className="mt-8">
          <Skeleton className="h-6 w-28" />
          <div className="mt-3 flex flex-col gap-3">
            <ProfileRegistryCardSkeleton />
            <ProfileRegistryCardSkeleton />
            <ProfileRegistryCardSkeleton />
          </div>
        </section>
      </div>
    </div>
  );
}

function FieldSkeleton() {
  return (
    <div className="space-y-1.5">
      <Skeleton className="h-5 w-20" />
      <Skeleton className="h-10 w-full rounded-lg" />
      <Skeleton className="h-4 w-40" />
    </div>
  );
}

function CheckboxSkeleton() {
  return (
    <div className="flex items-start gap-2">
      <Skeleton className="mt-0.5 h-4 w-4 shrink-0 rounded" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
    </div>
  );
}

/** Matches AccountSettings in src/components/account-settings.tsx. */
export function AccountSkeleton() {
  return (
    <div className="container mx-auto max-w-2xl px-4 py-8" aria-busy="true">
      <LoadingMessage>Loading your account</LoadingMessage>
      <div className="mb-6 flex items-center gap-2">
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
            <CardTitle>Your profile</CardTitle>
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldSkeleton />
            <CheckboxSkeleton />
            <CheckboxSkeleton />
            <CheckboxSkeleton />
            <Skeleton className="h-10 w-32 rounded-lg" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
