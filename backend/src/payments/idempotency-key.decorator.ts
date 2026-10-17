import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IdempotencyKeyPipe } from './idempotency-key.pipe';

/**
 * Extracts the `Idempotency-Key` request header and validates it with
 * `IdempotencyKeyPipe` (issue #1968). Nest's built-in `@Headers` decorator
 * cannot take a pipe, so the parameter decorator runs it directly; an
 * invalid or missing key fails the request with a 400 before the handler
 * body executes.
 */
export const IdempotencyKey = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<{
      headers: Record<string, string | string[] | undefined>;
    }>();
    return new IdempotencyKeyPipe().transform(
      request.headers['idempotency-key'],
    );
  },
);
