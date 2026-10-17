/**
 * Client-side payment amount validation (#1870).
 *
 * The `app/payments/new` amount input previously accepted negative numbers.
 * These helpers give the form a single positive-amount check to run before
 * submitting to the backend.
 */

/** Parse a raw input string into a positive amount, or `null` when invalid. */
export function parsePaymentAmount(raw: string): number | null {
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }
  return value;
}

/** Whether the raw input is a usable positive payment amount. */
export function isValidPaymentAmount(raw: string): boolean {
  return parsePaymentAmount(raw) !== null;
}
