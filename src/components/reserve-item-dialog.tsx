"use client";

import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { Check, Clock, Copy, ExternalLink, Gift } from "lucide-react";
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

// Giving an item: the guest fills in their details and presses one button,
// Reserve and buy. That holds the item for GIFT_HOLD_DAYS. On the owners' own
// store registry it also opens the store, which has their address. Otherwise
// it shows the address, with one button that copies it and opens the store.
// Back on this tab, the dialog asks whether they bought it.

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

/** What a custom trigger (the reservation banner) can do. */
export interface GiftTriggerControls {
  openAt: (step: "buy" | "confirm" | "release" | "details") => void;
  /** Saves the gift as bought, then shows the thank-you step. */
  confirmNow: () => void;
  busy: boolean;
}

const SERVER_ACTIONS: GiftActions = {
  reserve: reserveItem,
  confirm: confirmGift,
  release: releaseGift,
};

export interface ReserveItemDialogProps {
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
   *  registry. That store has the owners' address, so there's no address
   *  step, and Reserve and buy opens the store straight away. */
  registryStoreName?: string;
  /** The store's name, like "Amazon". Falls back to the link's host. */
  storeName?: string;
  /** The demo and stories pass their own. */
  actions?: Partial<GiftActions>;
  /** Opens the dialog at this step on load, from a link in the guest's email. */
  initialStep?: OpenGift["step"];
  /** Replaces the card's buttons, as the reservation banner does. */
  renderTrigger?: (controls: GiftTriggerControls) => React.ReactNode;
}

function hostName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function ShipTo({ address, copyable = true }: { address: string; copyable?: boolean }) {
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
      <p className="mb-1 text-xs font-medium text-tertiary">Ship to</p>
      <p className="whitespace-pre-line text-sm text-primary">{address}</p>
      {copyable && (
        <button
          type="button"
          onClick={copy}
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 transition-colors hover:text-brand-700"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? "Copied!" : "Copy address"}
        </button>
      )}
    </div>
  );
}

const textButton =
  "text-sm font-medium text-brand-600 underline-offset-2 hover:underline disabled:opacity-50";
const dangerTextButton =
  "text-sm font-medium text-error-primary underline-offset-2 hover:underline disabled:opacity-50";
const noteText = "text-center text-xs text-tertiary";

export function ReserveItemDialog({
  item,
  parentName = "The Registry Owner",
  gift: giftProp = null,
  shippingAddress,
  registryStoreName,
  storeName,
  actions,
  initialStep,
  renderTrigger,
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
  const shopName = item.external_url
    ? registryStoreName || storeName || hostName(item.external_url)
    : undefined;
  // On the owners' store registry, one tap reserves and opens the store.
  const oneTap = !!(item.external_url && registryStoreName);

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

  const handleSubmit = async (formData: FormData, storeTabOpened: boolean) => {
    setLoading(true);
    setError("");
    formData.set("itemId", item.id);
    if (step === "already") formData.set("alreadyBought", "1");

    const result = await act.reserve(formData);
    setLoading(false);
    if (!result || "error" in result) {
      leftForStore.current = false;
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
    // The buy step waits here while the guest is at the store. Coming back
    // to this tab moves it on to "Did you buy it?".
    if (result.status === "purchased") setStep("done");
    else {
      leftForStore.current = storeTabOpened;
      setStep("buy");
    }
  };

  const onSubmitForm = (e: React.FormEvent<HTMLFormElement>) => {
    // onSubmit, not action: an action's state updates wait for it to finish,
    // so the button wouldn't show "Reserving..." or stop a second submit.
    e.preventDefault();
    if (loading) return;
    const formData = new FormData(e.currentTarget);
    // Browsers only let a page open a tab during the click itself, so the
    // store opens now and the reservation saves alongside it. If saving
    // fails, the guest sees why when they come back to this tab.
    let opened = false;
    if (step === "reserve" && oneTap) {
      const tab = window.open(item.external_url!, "_blank");
      if (tab) {
        tab.opener = null;
        opened = true;
      }
    }
    void handleSubmit(formData, opened);
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

  const confirmNow = async () => {
    if (!gift || loading) return;
    setLoading(true);
    setError("");
    const result = await act.confirm(gift.purchaseId);
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      setReleaseFrom(null);
      setStep("confirm");
      setOpen(true);
      return;
    }
    setGift({ ...gift, status: "purchased", reservedUntil: null });
    setStep("done");
    setOpen(true);
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
  const newTabNote = shopName ? (
    <p className={noteText}>
      {shopName} opens in a new tab. Come back to this tab when you&apos;ve checked out.
    </p>
  ) : null;

  // The buttons on the card, or the banner's.
  let trigger: React.ReactNode = null;
  if (renderTrigger) {
    trigger = renderTrigger({ openAt, confirmNow: () => void confirmNow(), busy: loading });
  } else if (!gift) {
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
      <form onSubmit={onSubmitForm} className="space-y-4">
        {step === "reserve" ? (
          <div className="space-y-4">
            <DialogHeader className="pr-8">
              <DialogTitle>Gift the {item.title}</DialogTitle>
              <DialogDescription>
                {registryStoreName
                  ? `It's on ${parentName}'s ${registryStoreName} registry, so the store has their address.`
                  : "Reserve it so nobody else buys it, and you'll get the address to ship it to."}{" "}
                No account required.
              </DialogDescription>
            </DialogHeader>
            {(item.price || shopName) && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-secondary px-3 py-2 text-sm">
                <span className="text-secondary">
                  {item.price ? <span className="font-semibold text-primary">{formatPrice(item.price)}</span> : null}
                  {item.price && shopName ? " · " : null}
                  {shopName ? (registryStoreName ? `On their ${registryStoreName} registry` : `From ${shopName}`) : null}
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
        <div className="space-y-2">
          <Button type="submit" className="w-full" disabled={loading}>
            {step === "already" ? (
              loading ? "Saving..." : "Mark as bought"
            ) : loading ? (
              "Reserving..."
            ) : oneTap ? (
              <span className="inline-flex items-center gap-1.5">
                <ExternalLink className="h-4 w-4 shrink-0" />
                Reserve and buy at {registryStoreName}
              </span>
            ) : (
              "Reserve and buy"
            )}
          </Button>
          {step === "reserve" &&
            (oneTap ? (
              newTabNote
            ) : (
              <p className={noteText}>We&apos;ll hold it for you for {GIFT_HOLD_DAYS} days while you buy it.</p>
            ))}
        </div>
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
    const copyAndGo = !registryStoreName && !!address && !!item.external_url;
    content = (
      <div className="space-y-4">
        {until && (
          // mint-800, not 700: 700 on mint-50 is under 4.5:1 contrast.
          <p className="mr-8 flex items-center gap-2 rounded-lg border border-mint-200 bg-mint-50 px-3 py-2 text-sm font-medium text-mint-800">
            <Check className="h-4 w-4 shrink-0" />
            <span>Reserved for you until {until}</span>
          </p>
        )}
        <DialogHeader className={until ? undefined : "pr-8"}>
          <DialogTitle>
            {registryStoreName || !address ? (shopName ? `Buy it at ${shopName}` : "Buy it") : `Ship it to ${parentName}`}
          </DialogTitle>
          {registryStoreName ? (
            <DialogDescription>
              It&apos;s on their registry, so {registryStoreName} has their address.
            </DialogDescription>
          ) : !address ? (
            <DialogDescription>
              This registry has no shipping address yet. Ask {parentName} where to send it.
            </DialogDescription>
          ) : null}
        </DialogHeader>
        {!registryStoreName && address && <ShipTo address={address} copyable={!copyAndGo} />}
        {item.external_url ? (
          <div className="space-y-2">
            {/* A plain link styled as a button: Button's asChild drops onClick
                from links, and this click is how the dialog knows to ask
                "Did you buy it?" when the guest comes back. */}
            <a
              href={item.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ className: "w-full" })}
              onClick={() => {
                if (copyAndGo && address) navigator.clipboard?.writeText(address).catch(() => {});
                leftForStore.current = true;
              }}
            >
              <span className="inline-flex items-center gap-1.5">
                <ExternalLink className="h-4 w-4 shrink-0" />
                {copyAndGo ? `Copy address and open ${shopName}` : `Buy at ${shopName}`}
              </span>
            </a>
            {newTabNote}
          </div>
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
        <DialogHeader className="pr-8">
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
          {until ? <> until {until}</> : null} and remind you the day before. Finish it from the banner
          at the top of the registry, or the link in your email.
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
        {address && !registryStoreName && <ShipTo address={address} />}
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
