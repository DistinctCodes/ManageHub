import { Inject, Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaymentRail } from './enums/payment-rail.enum';
import { PaymentRailAdapter } from './interfaces/payment-rail-adapter.interface';
import { SandboxRailAdapter } from './adapters/sandbox-rail.adapter';
import { SOROBAN_RAIL_ADAPTER } from './soroban/soroban.tokens';

export interface PaymentRailResolution {
  adapter: PaymentRailAdapter;
  rail: PaymentRail;
  usedFallback: boolean;
}

type FallbackMap = Map<PaymentRail, PaymentRail | null>;

/**
 * Resolves the right PaymentRailAdapter for a Payment#rail (issue #1574 —
 * #1570 only ever needed one adapter, so nothing dispatched by rail yet).
 * FIAT always resolves to the sandbox adapter; the on-chain rails resolve
 * to the Soroban adapter only when it's actually configured
 * (SOROBAN_ENABLED=true) — otherwise callers get a clear error instead of
 * a payment silently going nowhere.
 *
 * `get` is the strict stored-rail lookup. `resolve` is deliberately separate
 * and is for initiation only: it may choose a configured fallback before a
 * provider is called, but it never changes the rail of a Payment that has
 * already been created. Webhooks, reconciliation, and refunds therefore keep
 * using `get(payment.rail)` and can always find the adapter that initiated
 * the payment.
 */
@Injectable()
export class PaymentRailRegistry {
  constructor(
    private readonly sandboxRailAdapter: SandboxRailAdapter,
    @Optional()
    @Inject(SOROBAN_RAIL_ADAPTER)
    private readonly sorobanRailAdapter: PaymentRailAdapter | undefined,
    @Optional()
    @Inject(ConfigService)
    private readonly config?: ConfigService,
  ) {}

  /**
   * Strict lookup used by every post-initiation path. An unavailable rail
   * retains the original, actionable configuration error.
   */
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

  /**
   * Reports configuration/registration availability without making a provider
   * network call. The current adapters have no health-probe contract, so an
   * adapter that is registered is considered available until an actual
   * initiation call reports a provider error. This keeps selection side
   * effect free and avoids pretending that a DNS or RPC probe is a payment
   * verdict.
   */
  isAvailable(rail: PaymentRail): boolean {
    return this.tryGet(rail) !== undefined;
  }

  /**
   * Resolves a rail for a new initiation. If the requested adapter is not
   * registered, follows the explicit `PAYMENT_RAIL_FAILOVER` edges in their
   * configured order and returns the first available adapter. The requested
   * rail is never silently rewritten on an existing Payment; the caller must
   * persist the returned rail and retain the request in metadata.
   */
  resolve(rail: PaymentRail): PaymentRailResolution {
    const requestedAdapter = this.tryGet(rail);
    if (requestedAdapter) {
      return { adapter: requestedAdapter, rail, usedFallback: false };
    }

    for (const fallbackRail of this.fallbackChain(rail)) {
      const fallbackAdapter = this.tryGet(fallbackRail);
      if (fallbackAdapter) {
        return {
          adapter: fallbackAdapter,
          rail: fallbackRail,
          usedFallback: true,
        };
      }
    }

    this.get(rail);
    throw new Error(`Payment rail ${rail} is unavailable and has no fallback`);
  }

  private tryGet(rail: PaymentRail): PaymentRailAdapter | undefined {
    try {
      return this.get(rail) ?? undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Parses the opt-in policy as a graph of one-way `FROM=TO` edges. A blank
   * target such as `FIAT=` explicitly terminates a chain. Multiple mappings
   * can describe a longer ordered chain, for example
   * `STELLAR_CUSTODIAL=FIAT,FIAT=STELLAR_EXTERNAL`.
   */
  private fallbackChain(requestedRail: PaymentRail): PaymentRail[] {
    const mappings = this.parseFallbackMappings();
    const chain: PaymentRail[] = [];
    const visited = new Set<PaymentRail>([requestedRail]);
    let current = mappings.get(requestedRail);

    while (current !== undefined && current !== null) {
      if (visited.has(current)) {
        throw new Error(
          `PAYMENT_RAIL_FAILOVER contains a cycle involving ${current}`,
        );
      }
      chain.push(current);
      visited.add(current);
      current = mappings.get(current);
    }

    return chain;
  }

  private parseFallbackMappings(): FallbackMap {
    const mappings: FallbackMap = new Map();
    const raw = this.config?.get<string>('PAYMENT_RAIL_FAILOVER');
    if (!raw?.trim()) {
      return mappings;
    }

    for (const entry of raw.split(',')) {
      const trimmed = entry.trim();
      if (!trimmed) {
        continue;
      }
      const separator = trimmed.indexOf('=');
      if (separator <= 0) {
        throw new Error(
          `Invalid PAYMENT_RAIL_FAILOVER entry "${trimmed}"; expected FROM=TO`,
        );
      }

      const from = this.parseRail(
        trimmed.slice(0, separator).trim(),
        'PAYMENT_RAIL_FAILOVER source',
      );
      if (mappings.has(from)) {
        throw new Error(
          `PAYMENT_RAIL_FAILOVER contains more than one mapping for ${from}`,
        );
      }

      const target = trimmed.slice(separator + 1).trim();
      mappings.set(
        from,
        target
          ? this.parseRail(target, 'PAYMENT_RAIL_FAILOVER target')
          : null,
      );
    }

    return mappings;
  }

  private parseRail(value: string, label: string): PaymentRail {
    if (!Object.values(PaymentRail).includes(value as PaymentRail)) {
      throw new Error(`${label} is not a known payment rail: ${value}`);
    }
    return value as PaymentRail;
  }
}
