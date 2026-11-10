import Link from "next/link";
import { ChevronRight, Gift01, Link01 } from "@untitledui/icons";
import { Button } from "@/components/ui/button";
import { RegistryAvatar, monogramFor } from "@/components/registry-avatar";
import { occasionLabel } from "@/lib/registry-copy";
import type { SharedLink } from "@/lib/shared-link";
import type { PersonalEventType, RegistryType } from "@/lib/types";

export interface ShareRegistry {
  id: string;
  title: string;
  registryType: RegistryType;
  eventType: PersonalEventType | null;
  photoUrl: string | null;
  /** Who the registry is for, for the monogram when there's no photo. */
  names: string | null;
}

/** The registry page with the add item dialog open on the shared link. */
export function addSharedLinkHref(registryId: string, shared: SharedLink): string {
  const params = new URLSearchParams({ add: "1", url: shared.url });
  if (shared.title) params.set("title", shared.title);
  return `/dashboard/registry/${registryId}?${params}`;
}

function linkHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * What /share shows: which registry gets a product shared from a phone. An
 * owner with one registry never sees it, because /share goes straight there.
 */
export function SharePicker({ shared, registries }: { shared: SharedLink | null; registries: ShareRegistry[] }) {
  return (
    <div className="container mx-auto max-w-lg px-4 pt-6 pb-10">
      {!shared ? (
        <>
          <h1 className="font-display text-display-xs font-semibold text-primary">There&apos;s no link to add</h1>
          <p className="mt-2 text-tertiary">
            What you shared didn&apos;t include a link to a product. Open the product in its store&apos;s app or
            your browser, then share it to Regibee again.
          </p>
          <Button asChild className="mt-6 max-sm:w-full">
            <Link href="/dashboard">Go to my registries</Link>
          </Button>
        </>
      ) : (
        <>
          <h1 className="font-display text-display-xs font-semibold text-primary">
            {registries.length === 0 ? "Make a registry first" : "Add to which registry?"}
          </h1>

          <div className="mt-4 flex items-start gap-3 rounded-2xl bg-secondary p-4">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary">
              <Link01 aria-hidden="true" className="size-5 text-fg-quaternary" />
            </span>
            <div className="min-w-0">
              {shared.title && <p className="line-clamp-2 font-medium text-primary">{shared.title}</p>}
              <p className="truncate text-sm text-tertiary">{linkHost(shared.url)}</p>
            </div>
          </div>

          {registries.length === 0 ? (
            <>
              <p className="mt-4 text-tertiary">
                You don&apos;t have a registry to add this to yet. Make one, then share the product to Regibee again.
              </p>
              <Button asChild className="mt-6 max-sm:w-full">
                <Link href="/dashboard/registry/new">Create a registry</Link>
              </Button>
            </>
          ) : (
            <ul className="mt-6 space-y-3">
              {registries.map((registry) => (
                <li key={registry.id}>
                  <Link
                    href={addSharedLinkHref(registry.id, shared)}
                    className="flex min-h-16 items-center gap-3 rounded-2xl border border-secondary bg-primary p-3 transition hover:bg-primary_hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    {registry.photoUrl || monogramFor(registry.names) ? (
                      <RegistryAvatar
                        photoUrl={registry.photoUrl}
                        names={registry.names}
                        className="size-12 text-base ring-2"
                      />
                    ) : (
                      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-50">
                        <Gift01 aria-hidden="true" className="size-5 text-brand-700" />
                      </span>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-primary">{registry.title}</span>
                      <span className="block text-sm text-tertiary">
                        {occasionLabel(registry.registryType, registry.eventType)}
                      </span>
                    </span>
                    <ChevronRight aria-hidden="true" className="size-5 shrink-0 text-fg-quaternary" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
