import { Keypair } from '@stellar/stellar-sdk';
import { loadSorobanConfig } from './soroban-config';

const TREASURY = Keypair.random();

function makeConfig(values: Record<string, string>) {
  return {
    get: jest.fn((key: string, fallback?: string) => values[key] ?? fallback),
  };
}

describe('loadSorobanConfig', () => {
  it('returns null without reading anything else when disabled', () => {
    const config = makeConfig({ SOROBAN_ENABLED: 'false' });

    expect(loadSorobanConfig(config as any)).toBeNull();
  });

  it('returns null when SOROBAN_ENABLED is unset', () => {
    const config = makeConfig({});

    expect(loadSorobanConfig(config as any)).toBeNull();
  });

  it('throws naming every missing required variable when enabled', () => {
    const config = makeConfig({ SOROBAN_ENABLED: 'true' });

    expect(() => loadSorobanConfig(config as any)).toThrow(
      /STELLAR_ESCROW_CONTRACT_ID.*STELLAR_SECRET_KEY.*STELLAR_NETWORK.*STELLAR_BENEFICIARY_ADDRESS/,
    );
  });

  it('loads a full config with comma-separated RPC urls when enabled', () => {
    const config = makeConfig({
      SOROBAN_ENABLED: 'true',
      STELLAR_ESCROW_CONTRACT_ID: 'CCONTRACT',
      STELLAR_SECRET_KEY: TREASURY.secret(),
      STELLAR_NETWORK: 'Test SDF Network ; September 2015',
      STELLAR_BENEFICIARY_ADDRESS: 'GBENEFICIARY',
      STELLAR_RPC_URLS: ' https://rpc-a.example, https://rpc-b.example ',
    });

    expect(loadSorobanConfig(config as any)).toEqual({
      contractId: 'CCONTRACT',
      networkPassphrase: 'Test SDF Network ; September 2015',
      treasurySecretKey: TREASURY.secret(),
      treasuryPublicKey: TREASURY.publicKey(),
      beneficiaryAddress: 'GBENEFICIARY',
      rpcUrls: ['https://rpc-a.example', 'https://rpc-b.example'],
    });
  });

  it('falls back to a single endpoint from STELLAR_HORIZON_URL when STELLAR_RPC_URLS is unset', () => {
    const config = makeConfig({
      SOROBAN_ENABLED: 'true',
      STELLAR_ESCROW_CONTRACT_ID: 'CCONTRACT',
      STELLAR_SECRET_KEY: TREASURY.secret(),
      STELLAR_NETWORK: 'Test SDF Network ; September 2015',
      STELLAR_BENEFICIARY_ADDRESS: 'GBENEFICIARY',
    });

    expect(loadSorobanConfig(config as any)?.rpcUrls).toEqual([
      'https://soroban-testnet.stellar.org',
    ]);
  });
});
