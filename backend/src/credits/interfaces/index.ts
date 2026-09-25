/**
 * Central barrel for the credits module's ports (issue #1810). Consumers
 * should import from `credits/interfaces` rather than reaching into
 * individual files, so interface shape changes stay localized here.
 */
export * from './external-payout-rail.interface';
