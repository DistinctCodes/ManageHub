import { HttpException, InternalServerErrorException } from '@nestjs/common';

export function handleError(error: any, message?: string): never {
  if (error instanceof HttpException) {
    throw error;
  }

  throw new InternalServerErrorException(
    message || 'An unexpected error occurred. Please try again later.'
  );
}

// Alias for compatibility with existing code
export function ErrorCatch(error: any, message?: string): never {
  return handleError(error, message);
}