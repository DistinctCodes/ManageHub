import { HttpException, InternalServerErrorException } from '@nestjs/common';

export function ErrorCatch(error: any, message: string): never {
  if (error instanceof HttpException) {
    throw error;
  }

  throw new InternalServerErrorException(`${message}: Internal server error`);
}
