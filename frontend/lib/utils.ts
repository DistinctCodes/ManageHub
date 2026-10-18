import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Minor-unit decimal places per currency that Intl does not know about or
 * that matter regardless of runtime Intl data. Backend amounts arrive as
 * integer minor units (see backend/src/payments/utils/minor-units.ts), so
 * `fromMinorUnits` has to know each currency's exponent to display a decimal.
 *
 * - XLM uses 7 decimals (stroops) even though it is not an ISO 4217 code.
 * - ISO 4217 zero-decimal and three-decimal currencies are listed explicitly
 *   so they resolve identically on runtimes with incomplete Intl data.
 * Anything not listed here (and any invalid code) falls through to Intl's
 * resolved fraction digits, ultimately 2 (the ISO 4217 default).
 */
const MINOR_UNIT_DECIMALS: Record<string, number> = {
  XLM: 7,
  JPY: 0, KRW: 0, VND: 0,
  BHD: 3, JOD: 3, KWD: 3, OMR: 3, IQD: 3, LYD: 3, TND: 3,
};

export function minorUnitDecimals(currency: string): number {
  const code = currency.toUpperCase();
  if (code in MINOR_UNIT_DECIMALS) return MINOR_UNIT_DECIMALS[code];
  try {
    const digits = new Intl.NumberFormat("en", { style: "currency", currency: code }).resolvedOptions().maximumFractionDigits;
    if (typeof digits === "number") return digits;
  } catch { /* invalid currency code, fall through */ }
  return 2;
}

/**
 * Convert an integer minor-unit amount (what the backend stores and returns)
 * into a displayable decimal amount for the currency's real exponent.
 * Non-finite input is mapped to 0 so a bad payload cannot break rendering.
 */
export function fromMinorUnits(amount: number, currency: string): number {
  if (!Number.isFinite(amount)) return 0;
  return amount / 10 ** minorUnitDecimals(currency);
}

export function formatCurrency(
  amount: number,
  currency: string,
  locale?: string,
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}
