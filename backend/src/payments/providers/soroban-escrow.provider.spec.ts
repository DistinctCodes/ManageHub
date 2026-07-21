import { ConfigService } from '@nestjs/config';
import { Keypair } from '@stellar/stellar-sdk';
import { SorobanEscrowProvider } from './soroban-escrow.provider';

/**
 * Builds a ConfigService stub whose `get(key, default)` reads from `values`,
 * falling back to the provided default when the key is absent — matching the
 * real @nestjs/config behaviour the provider relies on.
 */
function makeConfig(values: Record<string, string>): ConfigService {
  return {
    get: (key: string, defaultValue?: string) =>
      key in values ? values[key] : defaultValue,
  } as unknown as ConfigService;
}

describe('SorobanEscrowProvider', () => {
  describe('when SOROBAN_ENABLED is unset or false', () => {
    it('is disabled when the flag is unset', () => {
      const provider = new SorobanEscrowProvider(makeConfig({}));
      expect(provider.isEnabled).toBe(false);
    });

    it('is disabled when the flag is explicitly false', () => {
      const provider = new SorobanEscrowProvider(
        makeConfig({ SOROBAN_ENABLED: 'false' }),
      );
      expect(provider.isEnabled).toBe(false);
    });

    it('requires no Stellar configuration to construct', () => {
      expect(
        () => new SorobanEscrowProvider(makeConfig({ SOROBAN_ENABLED: 'false' })),
      ).not.toThrow();
    });
  });

  describe('when SOROBAN_ENABLED is true but config is incomplete', () => {
    it('throws at construction listing every missing variable', () => {
      expect(
        () => new SorobanEscrowProvider(makeConfig({ SOROBAN_ENABLED: 'true' })),
      ).toThrow(
        /STELLAR_ESCROW_CONTRACT_ID.*STELLAR_SECRET_KEY.*STELLAR_NETWORK.*STELLAR_BENEFICIARY_ADDRESS/,
      );
    });

    it('names the specific missing variable', () => {
      const config = makeConfig({
        SOROBAN_ENABLED: 'true',
        STELLAR_ESCROW_CONTRACT_ID: '0'.repeat(64),
        STELLAR_SECRET_KEY: Keypair.random().secret(),
        STELLAR_NETWORK: 'Test SDF Network ; September 2015',
        // STELLAR_BENEFICIARY_ADDRESS intentionally omitted
      });
      expect(() => new SorobanEscrowProvider(config)).toThrow(
        /STELLAR_BENEFICIARY_ADDRESS/,
      );
    });
  });

  describe('when SOROBAN_ENABLED is true and fully configured', () => {
    it('is enabled and exposes the configured beneficiary', () => {
      const beneficiary = Keypair.random().publicKey();
      const provider = new SorobanEscrowProvider(
        makeConfig({
          SOROBAN_ENABLED: 'true',
          STELLAR_ESCROW_CONTRACT_ID: '0'.repeat(64),
          STELLAR_SECRET_KEY: Keypair.random().secret(),
          STELLAR_NETWORK: 'Test SDF Network ; September 2015',
          STELLAR_BENEFICIARY_ADDRESS: beneficiary,
        }),
      );
      expect(provider.isEnabled).toBe(true);
      expect(provider.beneficiary).toBe(beneficiary);
    });

    it('never falls back to a placeholder beneficiary', () => {
      const provider = new SorobanEscrowProvider(
        makeConfig({
          SOROBAN_ENABLED: 'true',
          STELLAR_ESCROW_CONTRACT_ID: '0'.repeat(64),
          STELLAR_SECRET_KEY: Keypair.random().secret(),
          STELLAR_NETWORK: 'Test SDF Network ; September 2015',
          STELLAR_BENEFICIARY_ADDRESS: Keypair.random().publicKey(),
        }),
      );
      expect(provider.beneficiary).not.toContain('PLACEHOLDER');
    });
  });
});
