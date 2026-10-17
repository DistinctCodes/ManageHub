import { BadRequestException } from '@nestjs/common';

/**
 * Currency-code policy shared by request DTOs and service-level checks
 * (issue #1967). A length check alone let invalid or lower-case values
 * reach ledger columns and payment rails, where they either create
 * fragmented per-currency accounts or are rejected only by a provider.
 *
 * The allow-list is the active ISO 4217 set plus the Stellar assets an
 * operator explicitly configures (`STELLAR_ASSET_CODES`) and the native
 * lumens asset (XLM), which has no ISO 4217 code of its own.
 */
export const ISO_4217_CURRENCY_CODES: ReadonlySet<string> = new Set([
  'AED',
  'AFN',
  'ALL',
  'AMD',
  'ANG',
  'AOA',
  'ARS',
  'AUD',
  'AWG',
  'AZN',
  'BAM',
  'BBD',
  'BDT',
  'BGN',
  'BHD',
  'BIF',
  'BMD',
  'BND',
  'BOB',
  'BOV',
  'BRL',
  'BSD',
  'BTN',
  'BWP',
  'BYN',
  'BZD',
  'CAD',
  'CDF',
  'CHE',
  'CHF',
  'CHW',
  'CLF',
  'CLP',
  'CNY',
  'COP',
  'COU',
  'CRC',
  'CUC',
  'CUP',
  'CVE',
  'CZK',
  'DJF',
  'DKK',
  'DOP',
  'DZD',
  'EGP',
  'ERN',
  'ETB',
  'EUR',
  'FJD',
  'FKP',
  'GBP',
  'GEL',
  'GHS',
  'GIP',
  'GMD',
  'GNF',
  'GTQ',
  'GYD',
  'HKD',
  'HNL',
  'HTG',
  'HUF',
  'IDR',
  'ILS',
  'INR',
  'IQD',
  'IRR',
  'ISK',
  'JMD',
  'JOD',
  'JPY',
  'KES',
  'KGS',
  'KHR',
  'KMF',
  'KPW',
  'KRW',
  'KWD',
  'KYD',
  'KZT',
  'LAK',
  'LBP',
  'LKR',
  'LRD',
  'LSL',
  'LYD',
  'MAD',
  'MDL',
  'MGA',
  'MKD',
  'MMK',
  'MNT',
  'MOP',
  'MRU',
  'MUR',
  'MVR',
  'MWK',
  'MXN',
  'MXV',
  'MYR',
  'MZN',
  'NAD',
  'NGN',
  'NIO',
  'NOK',
  'NPR',
  'NZD',
  'OMR',
  'PAB',
  'PEN',
  'PGK',
  'PHP',
  'PKR',
  'PLN',
  'PYG',
  'QAR',
  'RON',
  'RSD',
  'RUB',
  'RWF',
  'SAR',
  'SBD',
  'SCR',
  'SDG',
  'SEK',
  'SGD',
  'SHP',
  'SLE',
  'SLL',
  'SOS',
  'SRD',
  'SSP',
  'STN',
  'SVC',
  'SYP',
  'SZL',
  'THB',
  'TJS',
  'TMT',
  'TND',
  'TOP',
  'TRY',
  'TTD',
  'TWD',
  'TZS',
  'UAH',
  'UGX',
  'USD',
  'USN',
  'UYI',
  'UYU',
  'UYW',
  'UZS',
  'VED',
  'VES',
  'VND',
  'VUV',
  'WST',
  'XAF',
  'XAG',
  'XAU',
  'XBA',
  'XBB',
  'XBC',
  'XBD',
  'XCD',
  'XDR',
  'XOF',
  'XPD',
  'XPF',
  'XPT',
  'XSU',
  'XTS',
  'XUA',
  'XXX',
  'YER',
  'ZAR',
  'ZMW',
  'ZWL',
]);

/** Native Stellar asset — not ISO 4217 but valid across the ledger. */
export const NATIVE_STELLAR_ASSET = 'XLM';

/**
 * Comma-separated list of additional Stellar asset codes (e.g. `USDC`)
 * that are accepted alongside the ISO 4217 and native XLM allow-lists.
 */
export const STELLAR_ASSET_CODES_ENV = 'STELLAR_ASSET_CODES';

export function configuredStellarAssetCodes(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  return (env[STELLAR_ASSET_CODES_ENV] ?? '')
    .split(',')
    .map((code) => code.trim().toUpperCase())
    .filter((code) => code.length > 0);
}

/**
 * True for a non-empty string that resolves to an allowed currency code.
 * The value is trimmed and upper-cased before the allow-list lookup, so
 * `usd` is accepted here and normalised by the DTO `@Transform`.
 */
export function isCurrencyCode(
  value: unknown,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return false;
  }
  const code = value.trim().toUpperCase();
  return (
    code === NATIVE_STELLAR_ASSET ||
    ISO_4217_CURRENCY_CODES.has(code) ||
    configuredStellarAssetCodes(env).includes(code)
  );
}

/**
 * Upper-cases and trims a caller-supplied currency, throwing a 400 when it
 * is not an ISO 4217 code or a configured Stellar asset. Used by services
 * so the policy is enforced on the write path even when a caller bypasses
 * DTO validation (internal callers, jobs, admin tooling).
 */
export function assertCurrencyCode(
  value: unknown,
  env: NodeJS.ProcessEnv = process.env,
): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new BadRequestException('Currency code must be a non-empty string');
  }
  const code = value.trim().toUpperCase();
  if (!isCurrencyCode(code, env)) {
    throw new BadRequestException(
      `"${value}" is not an ISO 4217 currency code or a configured Stellar asset`,
    );
  }
  return code;
}

/**
 * `class-transformer` helper that normalises a DTO currency field to
 * upper-case before class-validator runs, so the allow-list check sees the
 * same value the services will persist.
 */
export function transformCurrencyCode({ value }: { value: unknown }): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}
