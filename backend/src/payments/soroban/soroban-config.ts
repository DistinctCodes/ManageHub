import { ConfigService } from '@nestjs/config';
import { Keypair } from '@stellar/stellar-sdk';

export interface SorobanConfig {
  contractId: string;
  revenueDistributionContractId: string;
  networkPassphrase: string;
  treasurySecretKey: string;
  /** Derived once at load time — the treasury's own signing key never leaves loadSorobanConfig. */
  treasuryPublicKey: string;
  beneficiaryAddress: string;
  rpcUrls: string[];
  /**
   * Token contract address to escrow, keyed by 3-letter currency code
   * (#2165 — `create` requires the token on-chain). Every currency this
   * rail is used for must appear here or `create` has no token to pass.
   */
  escrowTokenAddresses: Record<string, string>;
}

const REQUIRED_KEYS = [
  'STELLAR_ESCROW_CONTRACT_ID',
  'STELLAR_REVENUE_DISTRIBUTION_CONTRACT_ID',
  'STELLAR_SECRET_KEY',
  'STELLAR_NETWORK',
  'STELLAR_BENEFICIARY_ADDRESS',
  'STELLAR_ESCROW_TOKEN_ADDRESSES',
] as const;

/**
 * Parses `STELLAR_ESCROW_TOKEN_ADDRESSES` as `CUR:ADDRESS,CUR:ADDRESS`
 * pairs into a currency -> token contract address map.
 */
function parseEscrowTokenAddresses(raw: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const pair of raw
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean)) {
    const [currency, address] = pair.split(':').map((p) => p.trim());
    if (currency && address) {
      result[currency.toUpperCase()] = address;
    }
  }
  return result;
}

/** Looks up the escrow token address for `currency`, or throws naming it. */
export function getEscrowTokenAddress(
  config: SorobanConfig,
  currency: string,
): string {
  const address = config.escrowTokenAddresses[currency.toUpperCase()];
  if (!address) {
    throw new Error(
      `No STELLAR_ESCROW_TOKEN_ADDRESSES entry configured for currency ${currency}`,
    );
  }
  return address;
}

/**
 * When SOROBAN_ENABLED=true, every variable this rail needs must be
 * present or the app refuses to start — naming exactly what's missing —
 * matching the promise already documented in .env.example. Leaving
 * SOROBAN_ENABLED unset/false skips this entirely: no Stellar config is
 * required and the on-chain rail is simply unavailable.
 */
export function loadSorobanConfig(config: ConfigService): SorobanConfig | null {
  const enabled = config.get<string>('SOROBAN_ENABLED', 'false') === 'true';
  if (!enabled) {
    return null;
  }

  const missing = REQUIRED_KEYS.filter((key) => !config.get<string>(key));
  if (missing.length > 0) {
    throw new Error(
      `SOROBAN_ENABLED=true but missing required config: ${missing.join(', ')}`,
    );
  }

  const rpcUrls = (config.get<string>('STELLAR_RPC_URLS') ?? '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean);
  if (rpcUrls.length === 0) {
    const fallback = config.get<string>(
      'STELLAR_HORIZON_URL',
      'https://soroban-testnet.stellar.org',
    );
    rpcUrls.push(fallback);
  }

  const treasurySecretKey = config.get<string>('STELLAR_SECRET_KEY')!;

  return {
    contractId: config.get<string>('STELLAR_ESCROW_CONTRACT_ID')!,
    revenueDistributionContractId: config.get<string>(
      'STELLAR_REVENUE_DISTRIBUTION_CONTRACT_ID',
    )!,
    networkPassphrase: config.get<string>('STELLAR_NETWORK')!,
    treasurySecretKey,
    treasuryPublicKey: Keypair.fromSecret(treasurySecretKey).publicKey(),
    beneficiaryAddress: config.get<string>('STELLAR_BENEFICIARY_ADDRESS')!,
    rpcUrls,
    escrowTokenAddresses: parseEscrowTokenAddresses(
      config.get<string>('STELLAR_ESCROW_TOKEN_ADDRESSES')!,
    ),
  };
}
