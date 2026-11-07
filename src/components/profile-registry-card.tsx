import Link from "next/link";
import { Calendar, Lock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { occasionLabel } from "@/lib/registry-copy";
import { RegistryIcon } from "@/components/registry-icon";
import type { ListedRegistry } from "@/lib/registry-listing";

export function ProfileRegistryCard({
  registry,
  isPast = false,
  ownerName,
}: {
  registry: ListedRegistry;
  isPast?: boolean;
  ownerName?: string;
}) {
  return (
    <Link
      href={`/r/${registry.slug}`}
      className="group flex items-center gap-4 rounded-xl border border-secondary bg-primary p-4 shadow-sm transition hover:border-primary"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#4f7e60]/10">
        <RegistryIcon
          registryType={registry.registry_type}
          eventType={registry.event_type}
          className="h-5 w-5 text-[#4f7e60]"
        />
      </span>
      <span className="min-w-0 flex-1">
        {ownerName && (
          <span className="block break-words text-xs font-medium text-tertiary">{ownerName}</span>
        )}
        <span className="block break-words font-medium text-primary group-hover:underline">
          {registry.title}
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-sm text-tertiary">
          <span>{occasionLabel(registry.registry_type, registry.event_type)}</span>
          {registry.event_date && (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(registry.event_date + "T00:00:00").toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          )}
        </span>
      </span>
      <span className="flex shrink-0 flex-col items-end gap-1">
        {!registry.is_public && (
          <Badge variant="secondary">
            <Lock className="h-3 w-3" />
            Followers only
          </Badge>
        )}
        {isPast && <Badge variant="secondary">Past</Badge>}
      </span>
    </Link>
  );
}
