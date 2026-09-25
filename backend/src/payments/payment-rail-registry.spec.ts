import { PaymentRailRegistry } from './payment-rail-registry';
import { PaymentRail } from './enums/payment-rail.enum';

describe('PaymentRailRegistry', () => {
  it('resolves FIAT to the sandbox adapter', () => {
    const sandbox = {} as any;
    const registry = new PaymentRailRegistry(sandbox, undefined);

    expect(registry.get(PaymentRail.FIAT)).toBe(sandbox);
  });

  it('resolves STELLAR_CUSTODIAL to the Soroban adapter when configured', () => {
    const sandbox = {} as any;
    const soroban = {} as any;
    const registry = new PaymentRailRegistry(sandbox, soroban);

    expect(registry.get(PaymentRail.STELLAR_CUSTODIAL)).toBe(soroban);
  });

  it('resolves STELLAR_EXTERNAL to the Soroban adapter when configured', () => {
    const sandbox = {} as any;
    const soroban = {} as any;
    const registry = new PaymentRailRegistry(sandbox, soroban);

    expect(registry.get(PaymentRail.STELLAR_EXTERNAL)).toBe(soroban);
  });

  it('throws a clear error for an on-chain rail when Soroban is not configured', () => {
    const sandbox = {} as any;
    const registry = new PaymentRailRegistry(sandbox, undefined);

    expect(() => registry.get(PaymentRail.STELLAR_CUSTODIAL)).toThrow(
      /SOROBAN_ENABLED/,
    );
  });

  it('resolves an available requested rail without using a fallback', () => {
    const sandbox = {} as any;
    const config = {
      get: jest.fn((key: string) =>
        key === 'PAYMENT_RAIL_FAILOVER'
          ? 'STELLAR_CUSTODIAL=FIAT,FIAT='
          : undefined,
      ),
    };
    const registry = new PaymentRailRegistry(
      sandbox,
      undefined,
      config as any,
    );

    expect(registry.resolve(PaymentRail.FIAT)).toEqual({
      adapter: sandbox,
      rail: PaymentRail.FIAT,
      usedFallback: false,
    });
  });

  it('uses the first explicitly configured available fallback', () => {
    const sandbox = {} as any;
    const config = {
      get: jest.fn((key: string) =>
        key === 'PAYMENT_RAIL_FAILOVER'
          ? 'STELLAR_CUSTODIAL=FIAT,FIAT='
          : undefined,
      ),
    };
    const registry = new PaymentRailRegistry(
      sandbox,
      undefined,
      config as any,
    );

    expect(registry.resolve(PaymentRail.STELLAR_CUSTODIAL)).toEqual({
      adapter: sandbox,
      rail: PaymentRail.FIAT,
      usedFallback: true,
    });
  });

  it('keeps the strict stored-rail error when no fallback is configured', () => {
    const sandbox = {} as any;
    const registry = new PaymentRailRegistry(sandbox, undefined);

    expect(registry.isAvailable(PaymentRail.FIAT)).toBe(true);
    expect(registry.isAvailable(PaymentRail.STELLAR_CUSTODIAL)).toBe(false);
    expect(() => registry.resolve(PaymentRail.STELLAR_CUSTODIAL)).toThrow(
      /SOROBAN_ENABLED/,
    );
  });
});
