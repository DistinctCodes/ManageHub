import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsStrongPassword(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName,
      options,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string') return false;
          return (
            value.length >= 8 &&
            /[A-Z]/.test(value) &&
            /[a-z]/.test(value) &&
            /\d/.test(value) &&
            /[^A-Za-z0-9]/.test(value)
          );
        },
        defaultMessage(args: ValidationArguments): string {
          const v = String(args.value ?? '');
          if (v.length < 8) return 'Password must be at least 8 characters';
          if (!/[A-Z]/.test(v)) return 'Password must contain an uppercase letter';
          if (!/[a-z]/.test(v)) return 'Password must contain a lowercase letter';
          if (!/\d/.test(v)) return 'Password must contain a digit';
          return 'Password must contain a special character';
        },
      },
    });
  };
}