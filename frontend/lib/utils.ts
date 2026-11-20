import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface CurrencyMetadata {
  code: string;
  exponent: number;
}

const serverExponents = new Map<string, number>();

export function registerCurrencyExponents(currencies: CurrencyMetadata[]): void {
  for (const { code, exponent } of currencies) {
    if (
      typeof code === "string" &&
      Number.isInteger(exponent) &&
      exponent >= 0 &&
      exponent <= 20
    ) {
      serverExponents.set(code.toUpperCase(), exponent);
    }
  }
}

const MINOR_UNIT_DECIMALS: Record<string, number> = {
  XLM: 7,
  JPY: 0, KRW: 0, VND: 0,
  BHD: 3, JOD: 3, KWD: 3, OMR: 3, IQD: 3, LYD: 3, TND: 3,
};

export function minorUnitDecimals(
  currency: string,
  serverExponent?: number,
): number {
  if (
    typeof serverExponent === "number" &&
    Number.isInteger(serverExponent) &&
    serverExponent >= 0
  ) {
    return serverExponent;
  }
  const code = currency.toUpperCase();
  const fromServer = serverExponents.get(code);
  if (fromServer !== undefined) return fromServer;
  if (code in MINOR_UNIT_DECIMALS) return MINOR_UNIT_DECIMALS[code];
  try {
    const digits = new Intl.NumberFormat("en", {
      style: "currency",
      currency: code,
    }).resolvedOptions().maximumFractionDigits;
    if (typeof digits === "number") return digits;
  } catch { /* invalid currency code, fall through */ }
  return 2;
}

export function fromMinorUnits(
  amount: number,
  currency: string,
  serverExponent?: number,
): number {
  if (!Number.isFinite(amount)) return 0;
  return amount / 10 ** minorUnitDecimals(currency, serverExponent);
}

export function formatCurrency(
  amount: number,
  currency: string,
  locale?: string,
  serverExponent?: number,
): string {
  const decimals = minorUnitDecimals(currency, serverExponent);
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  } catch {
    return `${new Intl.NumberFormat(locale, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount)} ${currency}`;
  }
}
