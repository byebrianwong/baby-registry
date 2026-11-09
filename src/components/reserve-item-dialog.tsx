"use client";

import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { Check, Clock, Copy, ExternalLink, Gift, Store } from "lucide-react";
import { Mail01 } from "@untitledui/icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  confirmGift,
  releaseGift,
  reserveItem,
  type ReserveItemResult,
} from "@/lib/actions/registry";
import { formatPrice } from "@/lib/money";
import {
  GIFT_HOLD_DAYS,
  formatReservedUntil,
  type GiftLinkStep,
  type MyItemGift,
} from "@/lib/gifts";

// One path for giving an item: reserve it (which holds it and shows the
// address), buy it at the store, then confirm. The card's buttons open the
// dialog at the step the guest's gift is on.

type Step =
  | "reserve"
  | "already"
  | "buy"
  | "confirm"
  | "notyet"
  | "done"
  | "release"
  | "details"
  | "ended";

/** Where a link from a guest's email opens the dialog. */
export interface OpenGift {
  itemId: string;
  step: GiftLinkStep | "ended";
}

export interface GiftActions {
  reserve: (formData: FormData) => Promise<ReserveItemResult>;
  confirm: (purchaseId: string) => Promise<{ error?: string }>;
  release: (purchaseId: string) => Promise<{ error?: string }>;
}

const SERVER_ACTIONS: GiftActions = {
  reserve: reserveItem,
  confirm: confirmGift,
  release: releaseGift,
};

interface ReserveItemDialogProps {
  item: {
    id: string;
    title: string;
    price: number | null;
    quantity_needed: number;
    quantity_fulfilled: number;
    external_url?: string | null;
  };
  parentName?: string;
  /** This visitor's gift on the item, if they have one. */
  gift?: MyItemGift | null;
  /** Only set for visitors the server has matched to a gift on this registry;
   *  a new reservation gets it back from the action instead. */
  shippingAddress?: string;
  /** Set when the item's link is from a store where the owner has their own
   *  registry. The Buy step then explains how to buy so the gift counts there. */
  registryStoreName?: string;
  /** The store's name, like "Amazon". Falls back to the link's host. */
  storeName?: string;
  /** The demo and stories pass their own. */
  actions?: Partial<GiftActions>;
  /** Opens the dialog at this step on load, from a link in the guest's email. */
  initialStep?: OpenGift["step"];
}

function hostName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function Stepper({ current }: { current: 0 | 1 | 2 }) {
  const labels = ["Reserve", "Buy", "Confirm"];
  return (
    <ol className="flex gap-2 pr-8" aria-label="Steps">
      {labels.map((label, i) => (
        <li
          key={label}
          aria-current={i === current ? "step" : undefined}
          className={`flex-1 border-t-[3px] pt-1.5 text-xs ${
            i < current
              ? "border-mint-500 text-mint-800"
              : i === current
                ? "border-brand-600 font-semibold text-brand-600"
                : "border-secondary text-tertiary"
          }`}
        >
          {i + 1}. {label}
        </li>
      ))}
    </ol>
  );
}

function ShipTo({ address, label = "Ship to" }: { address: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard
      ?.writeText(address)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  };
  return (
    <div className="rounded-lg border border-primary bg-secondary p-4 text-left">
      <p className="mb-1 text-xs font-medium text-tertiary">{label}</p>
      <p className="whitespace-pre-line text-sm text-primary">{address}</p>
      <button
        type="button"
        onClick={copy}
        className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 transition-colors hover:text-brand-700"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied!" : "Copy address"}
      </button>
    </div>
  );
}

const textButton =
  "text-sm font-medium text-brand-600 underline-offset-2 hover:underline disabled:opacity-50";
const dangerTextButton =
  "text-sm font-medium text-error-primary underline-offset-2 hover:underline disabled:opacity-50";

export function ReserveItemDialog({
  item,
  parentName = "The Registry Owner",
  gift: giftProp = null,
  shippingAddress,
  registryStoreName,
  storeName,
  actions,
  initialStep,
}: ReserveItemDialogProps) {
  const act: GiftActions = { ...SERVER_ACTIONS, ...actions };
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("reserve");
  const [gift, setGift] = useState<MyItemGift | null>(giftProp);
  const [address, setAddress] = useState(shippingAddress);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  // Where "Keep it" goes back to from the release step.
  const [releaseFrom, setReleaseFrom] = useState<Step | null>(null);
  const leftForStore = useRef(false);

  const remaining = item.quantity_needed - item.quantity_fulfilled;
  const shopName = item.external_url ? storeName || hostName(item.external_url) : undefined;

  // The page refreshes after each action, and its data wins.
  const giftKey = giftProp ? `${giftProp.purchaseId}:${giftProp.status}` : "";
  useEffect(() => {
    setGift(giftProp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [giftKey]);
  useEffect(() => {
    if (shippingAddress) setAddress(shippingAddress);
  }, [shippingAddress]);

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
    else if (giftProp?.status === "reserved") openAt(initialStep);
    else if (giftProp) openAt("details");
    else return;
    // Drop the step from the address so a reload doesn't open it again.
    const url = new URL(window.location.href);
    url.searchParams.delete("gift");
    url.searchParams.delete("step");
    window.history.replaceState(null, "", url.toString());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Back from the store tab, ask whether they bought it.
  useEffect(() => {
    if (!open || step !== "buy") return;
    const onVisible = () => {
      if (document.visibilityState === "visible" && leftForStore.current) {
        leftForStore.current = false;
        setStep("confirm");
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [open, step]);

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
    if (step === "already") formData.set("alreadyBought", "1");

    const result = await act.reserve(formData);
    setLoading(false);
    if (!result || "error" in result) {
      setError(result?.error ?? "Couldn't save this gift. Try again.");
      return;
    }
    setGift({
      purchaseId: result.purchaseId,
      status: result.status,
      reservedUntil: result.reservedUntil,
      quantity: parseInt(formData.get("quantity") as string) || 1,
    });
    if (result.shippingAddress) setAddress(result.shippingAddress);
    setStep(result.status === "purchased" ? "done" : "buy");
  };

  const handleConfirm = async () => {
    if (!gift) return;
    setLoading(true);
    setError("");
    const result = await act.confirm(gift.purchaseId);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setGift({ ...gift, status: "purchased", reservedUntil: null });
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
    setOpen(false);
  };

  const close = () => setOpen(false);
  const errorLine = error ? <p className="text-sm text-error-primary">{error}</p> : null;
  const until = gift?.reservedUntil ? (
    <span suppressHydrationWarning>{formatReservedUntil(gift.reservedUntil)}</span>
  ) : null;

  // The buttons on the card.
  let trigger: React.ReactNode = null;
  if (!gift) {
    if (remaining > 0) {
      trigger = (
        <Button onClick={() => openAt("reserve")}>
          <span className="inline-flex items-center gap-1.5">
            <Gift className="h-4 w-4 shrink-0" />
            Gift this
          </span>
        </Button>
      );
    }
  } else if (gift.status === "reserved") {
    trigger = (
      <div className="flex items-center gap-3">
        <button type="button" className={textButton} onClick={() => openAt("release")}>
          Release
        </button>
        <Button onClick={() => openAt("buy")}>Finish gift</Button>
      </div>
    );
  } else {
    trigger = (
      <button type="button" className={textButton} onClick={() => openAt("details")}>
        View your gift
      </button>
    );
  }

  let content: React.ReactNode = null;

  if (step === "reserve" || step === "already") {
    // One form for both steps, so typed details survive switching between them.
    content = (
      // onSubmit, not action: an action's state updates wait for it to finish,
      // so the button wouldn't show "Reserving..." or stop a second submit.
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!loading) handleSubmit(new FormData(e.currentTarget));
        }}
        className="space-y-4"
      >
        {step === "reserve" ? (
          <div className="space-y-4">
            <Stepper current={0} />
            <DialogHeader>
              <DialogTitle>Gift the {item.title}</DialogTitle>
              <DialogDescription>
                Reserve it so nobody else buys it. It&apos;s held for you for {GIFT_HOLD_DAYS} days,
                and you&apos;ll see where to ship it. No account required.
              </DialogDescription>
            </DialogHeader>
            {(item.price || shopName) && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-secondary px-3 py-2 text-sm">
                <span className="text-secondary">
                  {item.price ? <span className="font-semibold text-primary">{formatPrice(item.price)}</span> : null}
                  {item.price && shopName ? " · " : null}
                  {shopName ? `From ${shopName}` : null}
                </span>
                {item.external_url && (
                  <a
                    href={item.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
                  >
                    See it
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                  </a>
                )}
              </div>
            )}
          </div>
        ) : (
          <DialogHeader className="pr-8">
            <DialogTitle>Tell {parentName} you bought it</DialogTitle>
            <DialogDescription>
              They&apos;ll see it&apos;s from you, and nobody else will buy it. No account required.
            </DialogDescription>
          </DialogHeader>
        )}
        <Input label="Your Name" name="buyerName" placeholder="Alex Kim" isRequired />
        <Input
          label="Your Email"
          name="buyerEmail"
          type="email"
          placeholder="alex@example.com"
          icon={Mail01}
          isRequired
          hint={step === "reserve" ? "We'll email you the address and a link back to this gift." : undefined}
        />
        {item.quantity_needed > 1 && (
          <Input
            label="Quantity"
            name="quantity"
            type="number"
            min={1}
            max={remaining}
            defaultValue="1"
            hint={`${remaining} of ${item.quantity_needed} available to gift`}
          />
        )}
        <TextArea label="Message (optional)" name="message" placeholder="Congratulations!" rows={3} />
        {errorLine}
        <Button type="submit" className="w-full" disabled={loading}>
          {step === "reserve"
            ? loading
              ? "Reserving..."
              : `Reserve for ${GIFT_HOLD_DAYS} days`
            : loading
              ? "Saving..."
              : "Mark as bought"}
        </Button>
        <div className="flex justify-center">
          {step === "reserve" ? (
            <button type="button" className={textButton} onClick={() => setStep("already")}>
              Already bought it?
            </button>
          ) : (
            <button type="button" className={textButton} onClick={() => setStep("reserve")}>
              Back
            </button>
          )}
        </div>
      </form>
    );
  } else if (step === "buy") {
    content = (
      <div className="space-y-4">
        <Stepper current={1} />
        {until && (
          // mint-800, not 700: 700 on mint-50 is under 4.5:1 contrast.
          <p className="flex items-center gap-2 rounded-lg border border-mint-200 bg-mint-50 px-3 py-2 text-sm font-medium text-mint-800">
            <Check className="h-4 w-4 shrink-0" />
            <span>Reserved for you until {until}</span>
          </p>
        )}
        <DialogHeader>
          <DialogTitle>{shopName ? `Buy it at ${registryStoreName || shopName}` : "Buy it"}</DialogTitle>
          <DialogDescription>
            {registryStoreName
              ? `Buy it at ${registryStoreName} with the button below, so the gift counts toward their registry. At checkout, you can choose their registry address.`
              : address
                ? "Paste this address at checkout. Only guests who reserve a gift can see it."
                : `This registry has no shipping address yet. Ask ${parentName} where to send it.`}
          </DialogDescription>
        </DialogHeader>
        {registryStoreName && (
          <p className="flex items-center gap-2 text-sm text-secondary">
            <Store className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
            This gift is on {parentName}&apos;s {registryStoreName} registry
          </p>
        )}
        {address && <ShipTo address={address} />}
        {item.external_url ? (
          // A plain link styled as a button: Button's asChild drops onClick
          // from links, and this click is how the dialog knows to ask
          // "Did you buy it?" when the guest comes back.
          <a
            href={item.external_url}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ className: "w-full" })}
            onClick={() => {
              leftForStore.current = true;
            }}
          >
            <span className="inline-flex items-center gap-1.5">
              <ExternalLink className="h-4 w-4 shrink-0" />
              Buy at {registryStoreName || shopName}
            </span>
          </a>
        ) : (
          <Button className="w-full" onClick={() => setStep("confirm")}>
            I bought it
          </Button>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2">
          {item.external_url ? (
            <button type="button" className={textButton} onClick={() => setStep("confirm")}>
              I already bought it
            </button>
          ) : (
            <span />
          )}
          <button type="button" className={textButton} onClick={close}>
            Finish later
          </button>
        </div>
      </div>
    );
  } else if (step === "confirm") {
    content = (
      <div className="space-y-4">
        <Stepper current={2} />
        <DialogHeader>
          <DialogTitle>Did you buy the {item.title}?</DialogTitle>
          <DialogDescription>
            Tell us so nobody else buys it. {parentName} will see it&apos;s from you.
          </DialogDescription>
        </DialogHeader>
        {errorLine}
        <div className="grid gap-2">
          <Button onClick={handleConfirm} disabled={loading}>
            {loading ? "Saving..." : "Yes, I bought it"}
          </Button>
          <Button variant="outline" onClick={() => setStep("notyet")} disabled={loading}>
            Not yet
          </Button>
          <div className="flex justify-center pt-1">
            <button type="button" className={dangerTextButton} onClick={goToRelease} disabled={loading}>
              I&apos;m not getting it
            </button>
          </div>
        </div>
      </div>
    );
  } else if (step === "notyet") {
    content = (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-sunshine-100 bg-sunshine-50">
          <Clock className="h-8 w-8 text-primary" aria-hidden="true" />
        </span>
        <DialogTitle className="text-xl font-bold">It&apos;s still yours</DialogTitle>
        <p className="text-sm text-secondary">
          We&apos;ll hold the {item.title}
          {until ? <> until {until}</> : null} and email you a reminder before then. When you&apos;re
          ready, use Finish gift on this page or the link in your email.
        </p>
        <Button onClick={close}>Done</Button>
        <button type="button" className={dangerTextButton} onClick={goToRelease}>
          Release it instead
        </button>
      </div>
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
          {parentName} will see the {item.title} is from you. We emailed you a copy. ❤️
        </p>
        <Button onClick={close}>Done</Button>
      </div>
    );
  } else if (step === "release") {
    content = (
      <div className="space-y-4">
        <DialogHeader className="pr-8">
          <DialogTitle>
            {gift?.status === "purchased" ? `Undo your gift of the ${item.title}?` : `Release the ${item.title}?`}
          </DialogTitle>
          <DialogDescription>It goes back on the list so another guest can give it.</DialogDescription>
        </DialogHeader>
        {errorLine}
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => (releaseFrom ? setStep(releaseFrom) : close())}
            disabled={loading}
          >
            Keep it
          </Button>
          <Button variant="destructive" onClick={handleRelease} disabled={loading}>
            {loading ? "Releasing..." : gift?.status === "purchased" ? "Undo gift" : "Release gift"}
          </Button>
        </div>
      </div>
    );
  } else if (step === "details") {
    content = (
      <div className="space-y-4">
        <DialogHeader className="pr-8">
          <DialogTitle>Your gift</DialogTitle>
          <DialogDescription>
            You&apos;re giving the {item.title}
            {gift && gift.quantity > 1 ? ` (×${gift.quantity})` : ""}. {parentName} can see it&apos;s from you.
          </DialogDescription>
        </DialogHeader>
        {address && <ShipTo address={address} />}
        <div className="flex items-center justify-between gap-2">
          <button type="button" className={dangerTextButton} onClick={goToRelease}>
            Undo this gift
          </button>
          <Button onClick={close}>Done</Button>
        </div>
      </div>
    );
  } else if (step === "ended") {
    content = (
      <div className="space-y-4">
        <DialogHeader className="pr-8">
          <DialogTitle>Your reservation ended</DialogTitle>
          <DialogDescription>
            The {item.title} went back on the list for other guests.{" "}
            {remaining > 0 ? "It's still available, so you can reserve it again." : "Another guest has it now."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={close}>
            Close
          </Button>
          {remaining > 0 && <Button onClick={() => setStep("reserve")}>Reserve it again</Button>}
        </div>
      </div>
    );
  }

  return (
    <>
      {trigger}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className={step === "done" || step === "notyet" ? "sm:max-w-sm" : undefined}>
          {content}
        </DialogContent>
      </Dialog>
    </>
  );
}
