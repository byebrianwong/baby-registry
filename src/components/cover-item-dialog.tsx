"use client";

import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { HandCoins } from "lucide-react";
import { Mail01 } from "@untitledui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PaymentOptions } from "@/components/payment-methods-display";
import type { OpenGift } from "@/components/reserve-item-dialog";
import {
  coverParentPurchasedItem,
  releaseGift,
  type CoverItemResult,
} from "@/lib/actions/registry";
import { paymentNote } from "@/lib/payment-links";
import type { MyItemGift } from "@/lib/gifts";
import type { PaymentMethods } from "@/lib/types";
import { formatPrice } from "@/lib/money";

// Giving an item the owners already bought: the guest sends them its price,
// then says so. Paying takes seconds and nothing ships, so the gift is saved
// as given straight away, with no hold. The guest can undo it from the card or
// the link in their email.

type Step = "pay" | "done" | "details" | "release" | "ended";

export interface CoverActions {
  give: (formData: FormData) => Promise<CoverItemResult>;
  release: (purchaseId: string) => Promise<{ error?: string }>;
}

const SERVER_ACTIONS: CoverActions = {
  give: coverParentPurchasedItem,
  release: releaseGift,
};

interface CoverItemDialogProps {
  item: {
    id: string;
    title: string;
    price: number | null;
    quantity_needed: number;
  };
  /** How many are left for guests to give. */
  availableToGift?: number;
  paymentMethods?: PaymentMethods;
  parentName?: string;
  coverFlavor?: string;
  /** This visitor's gift on the item, if they have one. */
  gift?: MyItemGift | null;
  /** The demo and stories pass their own. */
  actions?: Partial<CoverActions>;
  /** Opens the dialog at this step on load, from a link in the guest's email. */
  initialStep?: OpenGift["step"];
  /** The demo registry: pay buttons don't open anything. */
  demo?: boolean;
}

// Text buttons get a 44px tap target on phones.
const textButton =
  "inline-flex items-center justify-center text-sm font-medium text-brand-600 underline-offset-2 hover:underline disabled:opacity-50 max-sm:min-h-11 max-sm:px-2";
const dangerTextButton =
  "inline-flex items-center justify-center text-sm font-medium text-error-primary underline-offset-2 hover:underline disabled:opacity-50 max-sm:min-h-11 max-sm:px-2";

export function CoverItemDialog({
  item,
  availableToGift,
  paymentMethods,
  parentName = "The Registry Owner",
  coverFlavor,
  gift: giftProp = null,
  actions,
  initialStep,
  demo,
}: CoverItemDialogProps) {
  const act: CoverActions = { ...SERVER_ACTIONS, ...actions };
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(giftProp ? "details" : "pay");
  const [gift, setGift] = useState<MyItemGift | null>(giftProp);
  // What's typed, so clearing the field to type a new number works. The amount
  // and links use the clamped quantity.
  const [quantityInput, setQuantityInput] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Where "Keep it" goes back to from the release step.
  const [releaseFrom, setReleaseFrom] = useState<Step | null>(null);

  const available = availableToGift ?? item.quantity_needed;
  const quantity = Math.max(1, Math.min(Math.max(available, 1), parseInt(quantityInput, 10) || 1));
  const amountFor = (qty: number) => (item.price ? item.price * qty : null);
  const amount = amountFor(quantity);
  const giftAmount = gift ? amountFor(gift.quantity) : null;
  const sentLabel = (value: number | null) => (value != null ? formatPrice(value) : "it");

  // The page refreshes after each action, and its data wins.
  const giftKey = giftProp ? `${giftProp.purchaseId}:${giftProp.status}` : "";
  useEffect(() => {
    setGift(giftProp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [giftKey]);

  const openAt = (next: Step) => {
    setError("");
    setReleaseFrom(null);
    setStep(next);
    setOpen(true);
  };

  const goToRelease = () => {
    setError("");
    setReleaseFrom(step);
    setStep("release");
  };

  // A link from the guest's email opens the dialog at a step, once.
  useEffect(() => {
    if (!initialStep) return;
    if (initialStep === "ended") openAt("ended");
    else if (giftProp && initialStep === "release") openAt("release");
    else if (giftProp) openAt("details");
    else return;
    // Drop the step from the address so a reload doesn't open it again.
    const url = new URL(window.location.href);
    url.searchParams.delete("gift");
    url.searchParams.delete("step");
    window.history.replaceState(null, "", url.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open || step !== "done") return;
    const defaults = {
      spread: 60,
      ticks: 100,
      gravity: 0.8,
      decay: 0.94,
      startVelocity: 30,
      disableForReducedMotion: true,
      // Mint, teal, sunshine, coral and blush from the brand palette
      // (src/styles/theme.css). canvas-confetti needs literal hex values.
      colors: ["#09c69a", "#004659", "#fae421", "#fe4c4d", "#f9b8b9"],
    };
    confetti({ ...defaults, particleCount: 40, origin: { x: 0.2, y: 0.6 }, angle: 60 });
    confetti({ ...defaults, particleCount: 40, origin: { x: 0.8, y: 0.6 }, angle: 120 });
  }, [open, step]);

  const handleSubmit = async (formData: FormData) => {
    setLoading(true);
    setError("");
    formData.set("itemId", item.id);
    formData.set("quantity", String(quantity));

    const result = await act.give(formData);
    setLoading(false);
    if (!result || "error" in result) {
      setError(result?.error ?? "Couldn't save this gift. Try again.");
      return;
    }
    setGift({ purchaseId: result.purchaseId, status: "purchased", reservedUntil: null, quantity });
    setStep("done");
  };

  const handleRelease = async () => {
    if (!gift) return;
    setLoading(true);
    setError("");
    const result = await act.release(gift.purchaseId);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setGift(null);
    setQuantityInput("1");
    setOpen(false);
  };

  const close = () => setOpen(false);
  const errorLine = error ? <p className="text-sm text-error-primary">{error}</p> : null;

  // The button on the card.
  let trigger: React.ReactNode = null;
  if (gift) {
    trigger = (
      <button type="button" className={textButton} onClick={() => openAt("details")}>
        View your gift
      </button>
    );
  } else if (available > 0) {
    trigger = (
      <Button
        className="!bg-mint-500 hover:!bg-mint-600 !ring-mint-500 !text-brand-900"
        onClick={() => openAt("pay")}
      >
        <span className="inline-flex items-center gap-1.5">
          <HandCoins className="h-4 w-4 shrink-0" />
          Gift this
        </span>
      </Button>
    );
  }

  let content: React.ReactNode = null;

  if (step === "pay") {
    content = (
      // onSubmit, not action: an action's state updates wait for it to finish,
      // so the button wouldn't show "Saving..." or stop a second submit.
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!loading) handleSubmit(new FormData(e.currentTarget));
        }}
        className="space-y-5"
      >
        <DialogHeader className="pr-8">
          <DialogTitle>Gift the {item.title}</DialogTitle>
          <DialogDescription>
            {coverFlavor || `${parentName} already bought this one.`} Give it by sending them the money for it.
          </DialogDescription>
        </DialogHeader>

        <section className="space-y-3" aria-labelledby="cover-pay-heading">
          <div className="rounded-lg bg-secondary px-4 py-3">
            <h3 id="cover-pay-heading" className="text-xs font-medium text-tertiary">
              1. Send {parentName}
            </h3>
            {amount != null ? (
              <p className="text-2xl font-semibold text-primary">{formatPrice(amount)}</p>
            ) : (
              <p className="text-sm text-secondary">What you&apos;d like to give. This item has no price.</p>
            )}
            {amount != null && quantity > 1 && item.price ? (
              <p className="text-xs text-tertiary">
                {quantity} × {formatPrice(item.price)}
              </p>
            ) : null}
          </div>
          {item.quantity_needed > 1 && (
            <Input
              label="How many"
              name="quantity"
              type="number"
              inputMode="numeric"
              min={1}
              max={available}
              value={quantityInput}
              onChange={setQuantityInput}
              onBlur={() => setQuantityInput(String(quantity))}
              hint={`${available} of ${item.quantity_needed} available to gift`}
            />
          )}
          <PaymentOptions
            paymentMethods={paymentMethods}
            amount={amount}
            note={paymentNote(item.title, quantity)}
            parentName={parentName}
            demo={demo}
          />
        </section>

        <section className="space-y-4" aria-labelledby="cover-tell-heading">
          <h3 id="cover-tell-heading" className="text-sm font-semibold text-primary">
            2. Tell {parentName} it&apos;s from you
          </h3>
          <Input
            label="Your Name"
            name="buyerName"
            placeholder="Alex Kim"
            autoComplete="name"
            enterKeyHint="next"
            isRequired
          />
          <Input
            label="Your Email"
            name="buyerEmail"
            type="email"
            placeholder="alex@example.com"
            autoComplete="email"
            enterKeyHint="next"
            icon={Mail01}
            isRequired
            hint="We'll email you a copy, with a link to undo it if you need to."
          />
          <TextArea label="Message (optional)" name="message" placeholder="Congratulations!" rows={3} />
          {errorLine}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Saving..." : `I sent ${sentLabel(amount)}`}
          </Button>
        </section>
      </form>
    );
  } else if (step === "done") {
    content = (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <img
          src="/hero/panda.svg"
          alt=""
          className="h-28 w-28"
          style={{ animation: "celebration-bounce 1.2s ease-in-out infinite" }}
        />
        <DialogTitle className="text-xl font-bold text-primary">Thank you!</DialogTitle>
        <p className="text-secondary">
          {parentName} will see you sent {sentLabel(giftAmount)} for the {item.title}. We emailed you a
          copy. ❤️
        </p>
        <Button onClick={close}>Done</Button>
      </div>
    );
  } else if (step === "details") {
    content = (
      <div className="space-y-4">
        <DialogHeader className="pr-8">
          <DialogTitle>Your gift</DialogTitle>
          <DialogDescription>
            You sent {sentLabel(giftAmount)} for the {item.title}
            {gift && gift.quantity > 1 ? ` (×${gift.quantity})` : ""}. {parentName} can see it&apos;s from you.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-between gap-2">
          <button type="button" className={dangerTextButton} onClick={goToRelease}>
            Undo this gift
          </button>
          <Button onClick={close}>Done</Button>
        </div>
      </div>
    );
  } else if (step === "release") {
    content = (
      <div className="space-y-4">
        <DialogHeader className="pr-8">
          <DialogTitle>Undo your gift of the {item.title}?</DialogTitle>
          <DialogDescription>
            It goes back on the list so another guest can give it. Undoing doesn&apos;t move any money, so
            if you sent some, ask {parentName} to send it back.
          </DialogDescription>
        </DialogHeader>
        {errorLine}
        <DialogFooter sticky>
          <Button
            variant="outline"
            onClick={() => (releaseFrom ? setStep(releaseFrom) : close())}
            disabled={loading}
          >
            Keep it
          </Button>
          <Button variant="destructive" onClick={handleRelease} disabled={loading}>
            {loading ? "Undoing..." : "Undo gift"}
          </Button>
        </DialogFooter>
      </div>
    );
  } else if (step === "ended") {
    content = (
      <div className="space-y-4">
        <DialogHeader className="pr-8">
          <DialogTitle>This gift was undone</DialogTitle>
          <DialogDescription>
            The {item.title} went back on the list.{" "}
            {available > 0 ? "You can gift it again." : "Other guests have given it since."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter sticky>
          <Button variant="outline" onClick={close}>
            Close
          </Button>
          {available > 0 && <Button onClick={() => setStep("pay")}>Gift it again</Button>}
        </DialogFooter>
      </div>
    );
  }

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={step === "done" ? "sm:max-w-sm" : undefined}>{content}</DialogContent>
      </Dialog>
    </>
  );
}
