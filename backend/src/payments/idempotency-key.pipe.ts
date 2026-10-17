import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';

/**
 * Accepted shape for an `Idempotency-Key`: 16–128 characters drawn from
 * `[A-Za-z0-9._:-]`. The lower bound prevents trivially guessable keys
 * (an idempotency key guards money movement, so a 1-character key would
 * let one client collide with another's); the upper bound and character
 * class keep the value safe to store and log (issue #1968).
 */
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9._:-]{16,128}$/;

@Injectable()
export class IdempotencyKeyPipe implements PipeTransform<unknown, string> {
  transform(value: unknown): string {
    if (typeof value !== 'string' || value.length === 0) {
      throw new BadRequestException('Idempotency-Key header is required');
    }
    if (!IDEMPOTENCY_KEY_PATTERN.test(value)) {
      throw new BadRequestException(
        'Idempotency-Key must be 16-128 characters from [A-Za-z0-9._:-]',
      );
    }
    return value;
  }
}
