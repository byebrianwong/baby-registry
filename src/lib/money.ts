// Dollar amounts read like "$3,784" and "$1,299.00", with thousands
// separators. Prices and single gifts keep their cents. Totals, goals and
// amounts raised round to whole dollars.

// Both digit limits are set: older browsers throw when only the maximum is
// below USD's default of 2.
const wholeDollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const dollarsAndCents = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/** "$3,784". For totals, goals and amounts raised. */
export function formatDollars(amount: number): string {
  return wholeDollars.format(amount);
}

/** "$1,299.00". For prices and single gifts. */
export function formatPrice(amount: number): string {
  return dollarsAndCents.format(amount);
}
