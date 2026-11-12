import Link from "next/link";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * What a list's owner or manager sees if they open a group gift on their own
 * list: nothing about it, so the surprise holds.
 */
export function GroupGiftSurprise({ listSlug }: { listSlug: string }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-sunshine-50">
        <Gift aria-hidden="true" className="size-6 text-primary" />
      </span>
      <h1 className="font-display text-2xl font-bold text-primary">This one&apos;s a surprise</h1>
      <p className="text-secondary">
        Someone is planning a gift from a list you manage. We&apos;re keeping the details from you so it stays a
        surprise.
      </p>
      <Button variant="outline" asChild>
        <Link href={`/r/${listSlug}`}>Back to your list</Link>
      </Button>
    </div>
  );
}
