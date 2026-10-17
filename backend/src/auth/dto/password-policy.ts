import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

/**
 * Password policy for local auth (issue #1954).
 *
 * bcrypt (cost 12, see AuthService) silently ignores any bytes past the
 * first 72, so two long passwords sharing a 72-byte prefix verify to the
 * same hash — the max length is therefore enforced, not just the minimum.
 * The most common/guessable passwords are rejected outright.
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 72;

/**
 * A deliberately small deny-list of the passwords that dominate every public
 * breach corpus. This is not a substitute for a full breach-corpus check
 * (Have I Been Pwned k-anonymity is the natural follow-up) but it removes
 * the trivially-guessable tail that a length rule alone would still accept.
 * Comparison is case-insensitive and ignores surrounding whitespace.
 */
const COMMON_PASSWORDS: ReadonlySet<string> = new Set([
  '123456',
  '12345678',
  '123456789',
  '1234567890',
  '111111',
  '123123',
  'abc123',
  'password',
  'password1',
  'password123',
  'p@ssw0rd',
  'passw0rd',
  'qwerty',
  'qwerty123',
  'qwertyuiop',
  'letmein',
  'iloveyou',
  'admin',
  'admin123',
  'welcome',
  'welcome1',
  'login',
  'princess',
  'dragon',
  'monkey',
  'football',
  'baseball',
  'superman',
  'michael',
  'sunshine',
  'shadow',
  'master',
  'trustno1',
  'starwars',
  'whatever',
  'zaq12wsx',
  'hunter2',
  'changeme',
  'secret',
  'default',
]);

export function isCommonPassword(value: string): boolean {
  return COMMON_PASSWORDS.has(value.trim().toLowerCase());
}

/**
 * class-validator decorator rejecting the common-password deny-list. Kept
 * next to the DTOs so the same rule can be applied to RegisterDto today and
 * to any future reset-password DTO without duplicating the list.
 */
export function IsNotCommonPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string): void {
    registerDecorator({
      name: 'isNotCommonPassword',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && !isCommonPassword(value);
        },
        defaultMessage(args: ValidationArguments): string {
          return (
            `${args.property} is one of the most common passwords and ` +
            'would be guessed instantly; choose something less predictable'
          );
        },
      },
    });
  };
}
