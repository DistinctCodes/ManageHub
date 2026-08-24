/**
 * DI token for the off-platform payout rail (issue #1575). The port is
 * declared by the credits module because that is who needs it; the
 * adapter that implements it over the #1574 Soroban escrow rail lives in
 * the payments module and is registered there, resolving to null whenever
 * the on-chain rail is disabled (SOROBAN_ENABLED is not true).
 *
 * Keeping the token in its own dependency-free file is what lets the
 * payments module provide it without either module importing the other's
 * module class.
 */
export const EXTERNAL_PAYOUT_RAIL = Symbol('EXTERNAL_PAYOUT_RAIL');
