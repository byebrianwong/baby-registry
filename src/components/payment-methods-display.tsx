"use client";

import type { PaymentMethods } from "@/lib/types";

interface PaymentMethodsDisplayProps {
  paymentMethods?: PaymentMethods;
}

export function PaymentMethodsDisplay({
  paymentMethods,
}: PaymentMethodsDisplayProps) {
  if (
    !paymentMethods ||
    (!paymentMethods.venmo && !paymentMethods.paypal && !paymentMethods.zelle)
  ) {
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
            <span>{paymentMethods.venmo}</span>
          </div>
        )}
        {paymentMethods.paypal && (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-tertiary w-14">
              PayPal
            </span>
            <span>{paymentMethods.paypal}</span>
          </div>
        )}
        {paymentMethods.zelle && (
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-tertiary w-14">
              Zelle
            </span>
            <span>{paymentMethods.zelle}</span>
          </div>
        )}
      </div>
    </div>
  );
}
