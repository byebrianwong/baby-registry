import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { registryStoreFor, type StoreId } from "@/lib/retailers";

/**
 * A quiet line on the owner's item card naming the store registry that gifts
 * bought through the item's link count toward. It uses the guest page's rule
 * (registryStoreFor), so it matches what guests are told. Shows nothing for
 * any other link: PlainLinksNotice and the item dialogs warn about plain links.
 */
export function StoreRegistryLine({
  url,
  linkedStores,
  className,
}: {
  url: string | null;
  /** The stores the owner linked in settings. */
  linkedStores: StoreId[];
  className?: string;
}) {
  const store = registryStoreFor(url, linkedStores);
  if (!store) return null;
  return (
    <p className={cn("flex items-center gap-1 text-xs text-tertiary", className)}>
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success-600" aria-hidden="true" />
      Counts toward your {store.name} registry
    </p>
  );
}
