/**
 * DI token for the conditionally-registered Soroban rail adapter — a
 * plain class token doesn't work here since the provider is only
 * registered at all when SOROBAN_ENABLED=true (see PaymentsModule).
 */
export const SOROBAN_RAIL_ADAPTER = Symbol('SOROBAN_RAIL_ADAPTER');

/** DI token for the escrow contract client, built from SorobanConfig. */
export const ESCROW_CONTRACT_CLIENT = Symbol('ESCROW_CONTRACT_CLIENT');

/** DI token for the resolved SorobanConfig (null when the rail is disabled). */
export const SOROBAN_CONFIG = Symbol('SOROBAN_CONFIG');

export const SOROBAN_ESCROW_QUEUE = 'soroban-escrow';
