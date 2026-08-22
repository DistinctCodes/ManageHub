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
});
