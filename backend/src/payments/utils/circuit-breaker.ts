import {
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import CircuitBreakerModule = require('opossum');

export interface PaymentProviderCircuitBreaker<
  TArgs extends unknown[],
  TResult,
> {
  fire(...args: TArgs): Promise<TResult>;
}

interface PaymentProviderCircuitBreakerInstance<
  TArgs extends unknown[],
  TResult,
> extends PaymentProviderCircuitBreaker<TArgs, TResult> {
  fallback(
    handler: (...args: [...TArgs, unknown]) => TResult | Promise<TResult>,
  ): PaymentProviderCircuitBreakerInstance<TArgs, TResult>;
}

interface CircuitBreakerOptions {
  timeout: number;
  errorThresholdPercentage: number;
  resetTimeout: number;
  volumeThreshold: number;
  name: string;
  errorFilter: (error: unknown) => boolean;
}

interface CircuitBreakerConstructor {
  isOurError(error: Error): boolean;

  new <TArgs extends unknown[], TResult>(
    action: (...args: TArgs) => Promise<TResult>,
    options: CircuitBreakerOptions,
  ): PaymentProviderCircuitBreakerInstance<TArgs, TResult>;
}

const CircuitBreaker =
  CircuitBreakerModule as unknown as CircuitBreakerConstructor;

/**
 * Creates a breaker for one external provider action. A ConflictException is
 * a domain/business rejection and is filtered out; transport, timeout, and
 * other provider failures count toward opening the circuit. The volume
 * threshold keeps a low-traffic rail from opening after a single transient
 * error, while the fallback turns an open circuit into a clear HTTP 503
 * response without hiding the original error while the rail is still closed.
 */
export function createPaymentProviderCircuitBreaker<
  TArgs extends unknown[],
  TResult,
>(
  action: (...args: TArgs) => Promise<TResult>,
  config: ConfigService,
  name: string,
): PaymentProviderCircuitBreaker<TArgs, TResult> {
  const breaker = new CircuitBreaker(action, {
    timeout: config.get<number>('PAYMENT_PROVIDER_BREAKER_TIMEOUT_MS', 10000),
    errorThresholdPercentage: config.get<number>(
      'PAYMENT_PROVIDER_BREAKER_ERROR_THRESHOLD_PERCENT',
      50,
    ),
    resetTimeout: config.get<number>(
      'PAYMENT_PROVIDER_BREAKER_RESET_TIMEOUT_MS',
      30000,
    ),
    volumeThreshold: 10,
    name: `payment-provider-${name}`,
    errorFilter: (error: unknown) => error instanceof ConflictException,
  });

  return breaker.fallback((...args) => {
    const error = args[args.length - 1];
    if (error instanceof Error && CircuitBreaker.isOurError(error)) {
      throw new ServiceUnavailableException(
        'Payment provider temporarily unavailable, please retry',
      );
    }
    throw error;
  });
}
