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

// Field names whose value should never reach the client, wherever they show
// up inside a `key: value`, `key=value`, or `key="value"` style substring of
// an error message (issue #1779) — e.g. a raw driver error that happens to
// echo back part of the connection options it was given.
const SENSITIVE_KEY_PATTERN =
  /\b((?:api[_-]?)?(?:secret|token|password|passwd|pwd|auth(?:orization)?)[a-z_]*)\s*[:=]\s*("[^"]*"|'[^']*'|(?:Bearer\s+)?\S+)/gi;

// `scheme://user:pass@host` connection strings (Postgres, MySQL, MongoDB,
// Redis, AMQP, ...) — the credential portion is redacted, the scheme/host
// are left intact since they're useful for debugging and not secret.
const CONNECTION_STRING_PATTERN =
  /([a-z][a-z0-9+.-]*:\/\/)[^:/?#\s]+:[^@/?#\s]+@/gi;

// A standalone bearer/JWT-shaped token (three dot-separated base64url
// segments), independent of any surrounding key name.
const JWT_PATTERN =
  /\b[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g;

/**
 * Strips tokens, secrets, and connection-string credentials out of a
 * message before it can reach an HTTP response (issue #1779). Applied
 * unconditionally (not just in non-dev environments) since a client-facing
 * error payload should never carry these regardless of environment; the
 * full, unredacted detail is still available server-side in the log line
 * this filter writes below.
 */
export function redactSensitive(message: string): string {
  return message
    .replace(CONNECTION_STRING_PATTERN, '$1[REDACTED]@')
    .replace(SENSITIVE_KEY_PATTERN, '$1=[REDACTED]')
    .replace(JWT_PATTERN, '[REDACTED]');
}

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
    const message = redactSensitive(
      exception instanceof HttpException
        ? exception.message
        : 'Internal server error',
    );

    // Stack traces (which can contain far more than the message, e.g. full
    // query text) are only ever logged server-side here, never sent to the
    // client in the response body below.
    this.logger.error(
      `${request.method} ${request.url} failed${
        currentRequestId() ? ` requestId=${currentRequestId()}` : ''
      }: ${exception instanceof Error ? (exception.stack ?? exception.message) : String(exception)}`,
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
