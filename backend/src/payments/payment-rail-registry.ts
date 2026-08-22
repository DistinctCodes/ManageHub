import { Inject, Injectable, Optional } from '@nestjs/common';
import { PaymentRail } from './enums/payment-rail.enum';
import { PaymentRailAdapter } from './interfaces/payment-rail-adapter.interface';
import { SandboxRailAdapter } from './adapters/sandbox-rail.adapter';
import { SOROBAN_RAIL_ADAPTER } from './soroban/soroban.tokens';

/**
 * Resolves the right PaymentRailAdapter for a Payment#rail (issue #1574 —
 * #1570 only ever needed one adapter, so nothing dispatched by rail yet).
 * FIAT always resolves to the sandbox adapter; the on-chain rails resolve
 * to the Soroban adapter only when it's actually configured
 * (SOROBAN_ENABLED=true) — otherwise callers get a clear error instead of
 * a payment silently going nowhere.
 */
@Injectable()
export class PaymentRailRegistry {
  constructor(
    private readonly sandboxRailAdapter: SandboxRailAdapter,
    @Optional()
    @Inject(SOROBAN_RAIL_ADAPTER)
    private readonly sorobanRailAdapter: PaymentRailAdapter | undefined,
  ) {}

  get(rail: PaymentRail): PaymentRailAdapter {
    switch (rail) {
      case PaymentRail.FIAT:
        return this.sandboxRailAdapter;
      case PaymentRail.STELLAR_CUSTODIAL:
      case PaymentRail.STELLAR_EXTERNAL:
        if (!this.sorobanRailAdapter) {
          throw new Error(
            `Payment rail ${rail} requires the Soroban escrow rail, but ` +
              'it is not configured (SOROBAN_ENABLED is not true)',
          );
        }
        return this.sorobanRailAdapter;
    }
  }
}
