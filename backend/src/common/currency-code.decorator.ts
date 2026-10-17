import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { isCurrencyCode } from './currency-code';

/**
 * Validates that a field is an ISO 4217 currency code or a configured
 * Stellar asset (issue #1967). Pair it with the `transformCurrencyCode`
 * `@Transform` helper so lower-case input is normalised before this check.
 */
export function IsCurrencyCode(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isCurrencyCode',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return isCurrencyCode(value);
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must be an ISO 4217 currency code or a configured Stellar asset`;
        },
      },
    });
  };
}
