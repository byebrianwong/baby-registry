"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import type { PaymentMethods } from "@/lib/types";
import { paypalPayUrl, venmoPayUrl } from "@/lib/payment-links";

interface PaymentMethodsDisplayProps {
  paymentMethods?: PaymentMethods;
}

function hasPaymentMethod(paymentMethods?: PaymentMethods): paymentMethods is PaymentMethods {
  return !!paymentMethods && !!(paymentMethods.venmo || paymentMethods.paypal || paymentMethods.zelle);
}

/** The owners' handles as plain text, for gifts to a cash fund. */
export function PaymentMethodsDisplay({
  paymentMethods,
}: PaymentMethodsDisplayProps) {
  if (!hasPaymentMethod(paymentMethods)) {
    return (
      <p className="text-sm text-tertiary">
        Contact the registry owner directly to arrange payment.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Send payment via:</p>
      <div className="space-y-1.5">
        {paymentMethods.venmo && (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-tertiary w-14">
              Venmo
            </span>
            <span className="min-w-0 break-all">{paymentMethods.venmo}</span>
          </div>
        )}
        {paymentMethods.paypal && (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-tertiary w-14">
              PayPal
            </span>
            <span className="min-w-0 break-all">{paymentMethods.paypal}</span>
          </div>
        )}
        {paymentMethods.zelle && (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-tertiary w-14">
              Zelle
            </span>
            <span className="min-w-0 break-all">{paymentMethods.zelle}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function PayLink({ href, service, demo }: { href: string; service: string; demo?: boolean }) {
  const label = (
    <span className="inline-flex items-center gap-1.5">
      Pay with {service}
      <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
    </span>
  );
  // The demo's handles may belong to real people, so its buttons go nowhere.
  if (demo) {
    return (
      <button type="button" className={buttonVariants({ variant: "outline", className: "w-full" })}>
        {label}
      </button>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonVariants({ variant: "outline", className: "w-full" })}
    >
      {label}
    </a>
  );
}

function CopyHandle({ service, handle, hint }: { service: string; handle: string; hint: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard
      ?.writeText(handle)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  };
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-primary px-3 py-2">
      <div className="min-w-0 text-sm">
        <p className="font-medium text-primary">{service}</p>
        <p className="break-all text-secondary">{handle}</p>
        <p className="text-xs text-tertiary">{hint}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? `Copied ${service} handle` : `Copy ${service} handle`}
        className={buttonVariants({ variant: "outline", size: "sm", className: "shrink-0" })}
      >
        <span className="inline-flex items-center gap-1.5">
          {copied ? <Check className="h-4 w-4 shrink-0" /> : <Copy className="h-4 w-4 shrink-0" />}
          {copied ? "Copied" : "Copy"}
        </span>
      </button>
    </div>
  );
}

interface PaymentOptionsProps {
  paymentMethods?: PaymentMethods;
  /** Filled in where the service takes an amount. Leave out when it's unknown. */
  amount?: number | null;
  /** Filled in where the service takes a note (Venmo only). */
  note?: string;
  parentName: string;
  /** The demo registry: pay buttons don't open anything. */
  demo?: boolean;
}

/**
 * A button per payment method that opens it with the amount filled in. A
 * handle we can't build a link for, like a PayPal email or any Zelle handle,
 * gets a Copy button instead.
 */
export function PaymentOptions({ paymentMethods, amount, note, parentName, demo }: PaymentOptionsProps) {
  if (!hasPaymentMethod(paymentMethods)) {
    return (
      <p className="text-sm text-secondary">
        This registry has no Venmo, PayPal or Zelle yet. Ask {parentName} how they&apos;d like you to send it.
      </p>
    );
  }

  const venmoUrl = venmoPayUrl({ handle: paymentMethods.venmo, amount, note });
  const paypalUrl = paypalPayUrl({ handle: paymentMethods.paypal, amount });

  return (
    <div className="grid gap-2">
      {paymentMethods.venmo &&
        (venmoUrl ? (
          <PayLink href={venmoUrl} service="Venmo" demo={demo} />
        ) : (
          <CopyHandle service="Venmo" handle={paymentMethods.venmo} hint="Send it in the Venmo app." />
        ))}
      {paymentMethods.paypal &&
        (paypalUrl ? (
          <PayLink href={paypalUrl} service="PayPal" demo={demo} />
        ) : (
          <CopyHandle service="PayPal" handle={paymentMethods.paypal} hint="Send it in PayPal." />
        ))}
      {paymentMethods.zelle && (
        <CopyHandle service="Zelle" handle={paymentMethods.zelle} hint="Send it from your bank's app." />
      )}
      {demo && (venmoUrl || paypalUrl) && (
        <p className="text-xs text-tertiary">In the demo, these buttons don&apos;t open Venmo or PayPal.</p>
      )}
    </div>
  );
}
