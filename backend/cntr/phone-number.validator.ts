import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

const E164_REGEX = /^\+[1-9]\d{6,14}$/;

@ValidatorConstraint({ name: 'isInternationalPhone', async: false })
class IsInternationalPhoneConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && E164_REGEX.test(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} must be a valid E.164 international phone number (e.g. +12025550100).`;
  }
}

export function IsInternationalPhone(options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [],
      validator: IsInternationalPhoneConstraint,
    });
  };
}
