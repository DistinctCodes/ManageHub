import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import type { Request } from 'express';

@ValidatorConstraint({ name: 'isAllowedMimeType', async: false })
class IsAllowedMimeTypeConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const [allowedTypes] = args.constraints as [string[]];
    return typeof value === 'string' && allowedTypes.includes(value);
  }

  defaultMessage(args: ValidationArguments): string {
    const [allowedTypes] = args.constraints as [string[]];
    return `${args.property} must be one of: ${allowedTypes.join(', ')}.`;
  }
}

export function IsAllowedMimeType(allowedTypes: string[], options?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options,
      constraints: [allowedTypes],
      validator: IsAllowedMimeTypeConstraint,
    });
  };
}

type MulterFile = Express.Multer.File;
type MulterCallback = (error: Error | null, acceptFile: boolean) => void;

export function createMimeTypeFilter(allowedTypes: string[]) {
  return function fileFilter(
    _req: Request,
    file: MulterFile,
    cb: MulterCallback,
  ): void {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}. Allowed: ${allowedTypes.join(', ')}.`), false);
    }
  };
}
