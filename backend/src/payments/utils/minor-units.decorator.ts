import { applyDecorators } from '@nestjs/common';
import { IsInt, IsPositive, Max, ValidationOptions } from 'class-validator';
import { MAX_MINOR_UNITS } from './minor-units';

/**
 * Validation for a positive integer amount expressed in minor units
 * (issue #1966). Amounts and metered quantities must be whole, strictly
 * positive, and no larger than the safe-integer range — anything larger
 * can overflow the bigint ledger columns on the way in or lose precision
 * in a later multiplication. The ceiling is `MAX_MINOR_UNITS`, the same
 * bound the `minor-units.ts` arithmetic helpers enforce, so a value that
 * passes validation can always be scaled exactly.
 */
export function MinorUnits(validationOptions?: ValidationOptions) {
  return applyDecorators(
    IsInt(validationOptions),
    IsPositive(validationOptions),
    Max(MAX_MINOR_UNITS, validationOptions),
  );
}
