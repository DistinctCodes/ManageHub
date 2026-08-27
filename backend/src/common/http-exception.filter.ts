import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { currentRequestId } from './request-context';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error';

    this.logger.error(
      `${request.method} ${request.url} failed${
        currentRequestId() ? ` requestId=${currentRequestId()}` : ''
      }: ${exception instanceof Error ? exception.stack ?? exception.message : String(exception)}`,
    );

    response.status(status).json({
      statusCode: status,
      message,
      requestId: currentRequestId() ?? response.getHeader('x-request-id'),
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
