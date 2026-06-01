import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isDateRangeValid', async: false })
class IsDateRangeValidConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments): boolean {
    const obj = args.object as Record<string, unknown>;
    const start = obj['startDate'];
    const end = obj['endDate'];

    if (!(start instanceof Date) || !(end instanceof Date)) {
      const startMs = start ? new Date(start as string).getTime() : NaN;
      const endMs = end ? new Date(end as string).getTime() : NaN;
      if (isNaN(startMs) || isNaN(endMs)) return true; // let @IsDate handle missing values
      return startMs < endMs;
    }

    return start.getTime() < end.getTime();
  }

  defaultMessage(): string {
    return 'startDate must be before endDate.';
  }
}

export function IsDateRangeValid(options?: ValidationOptions) {
  return function (target: Function) {
    registerDecorator({
      target,
      propertyName: 'startDate',
      options,
      constraints: [],
      validator: IsDateRangeValidConstraint,
    });
  };
}
