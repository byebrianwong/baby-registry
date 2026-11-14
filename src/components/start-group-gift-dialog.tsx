"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DollarSign, Users } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/base/input/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { startGroupGift } from "@/lib/actions/group-gifts";
import { formatPrice } from "@/lib/money";
import { PAYBACK_NOTE_MAX, groupGiftPath, parseGroupGiftAmount } from "@/lib/group-gifts";

export interface StartGroupGiftDialogProps {
  /** The list it's started from. */
  registryId: string;
  item: { id: string; title: string; price: number | null };
  /** Whose list it is, like "Dorothy". */
  recipientName: string;
  /** Starting one needs an account. Signed-out visitors are asked to sign in. */
  signedIn: boolean;
  /** Where signing in comes back to: the list's page. */
  returnTo: string;
  /** The event the viewer came from. Its guests see the group gift on their invitation. */
  eventTitle?: string | null;
  /** Stories pass their own. */
  action?: typeof startGroupGift;
}

/**
 * "Group gift" on an item: reserve it in your name and collect money from
 * friends from a link you share. The money comes to whoever starts it, and
 * they buy it.
 */
export function StartGroupGiftDialog({
  registryId,
  item,
  recipientName,
  signedIn,
  returnTo,
  eventTitle,
  action = startGroupGift,
}: StartGroupGiftDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [goal, setGoal] = useState(item.price ? String(item.price) : "");
  const [payback, setPayback] = useState("");

  async function submit() {
    if (goal.trim() && parseGroupGiftAmount(goal) === null) {
      setError("Enter the total to collect, like 120.");
      return;
    }
    setPending(true);
    setError("");
    try {
      const result = await action({
        registryId,
        itemId: item.id,
        goalAmount: goal.trim() || null,
        paybackNote: payback,
      });
      if (result.error !== undefined) {
        setError(result.error);
        setPending(false);
        return;
      }
      router.push(groupGiftPath(result.token));
    } catch {
      setError("Something went wrong. Try again in a moment.");
      setPending(false);
    }
  }

  const loginHref = `/login?redirect=${encodeURIComponent(returnTo)}`;
  const signupHref = `/signup?redirect=${encodeURIComponent(returnTo)}`;

  return (
    <>
      <Button
        variant="outline"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
      >
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
          Group gift
        </span>
      </Button>
      <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <DialogContent>
          <DialogHeader className="pr-8">
            <DialogTitle>Go in on it together</DialogTitle>
            <DialogDescription>
              Reserve the {item.title}
              {item.price ? ` (${formatPrice(item.price)})` : ""} and share a link so friends can chip in. They pay
              you back, and you buy it. {recipientName} sees it&apos;s from you and others, never who chipped in.
            </DialogDescription>
          </DialogHeader>

          {signedIn ? (
            <form
              noValidate
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              <Input
                label="Total to collect"
                icon={DollarSign}
                inputMode="decimal"
                placeholder="120"
                value={goal}
                onChange={setGoal}
                isInvalid={Boolean(error) && goal.trim() !== "" && parseGroupGiftAmount(goal) === null}
                hint="Usually the price. Leave it empty if you're not sure yet."
              />
              <Input
                label="How should people pay you back?"
                placeholder="Venmo @your-name"
                maxLength={PAYBACK_NOTE_MAX}
                value={payback}
                onChange={setPayback}
                hint="Your Venmo, PayPal or Zelle. Regibee never holds the money."
              />
              <p className="text-sm text-tertiary">
                It stays reserved in your name until you buy it, so nobody else will.
                {eventTitle && ` Guests of ${eventTitle} will see it on their invitation and can chip in too.`}
              </p>
              {error && (
                <p role="alert" className="text-sm text-error-primary">
                  {error}
                </p>
              )}
              <DialogFooter sticky>
                <Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? "Starting..." : "Start group gift"}
                </Button>
              </DialogFooter>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-secondary">
                Sign in to start one. Friends who chip in don&apos;t need an account.
              </p>
              <DialogFooter sticky>
                <Link href={signupHref} className={buttonVariants({ variant: "outline" })}>
                  Create an account
                </Link>
                <Link href={loginHref} className={buttonVariants()}>
                  Sign in
                </Link>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
