import type { LoggerService, LogLevel } from '@nestjs/common';
import pino from 'pino';
import { currentRequestId } from './request-context';

type PinoLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug';

/**
 * Nest-compatible logger backed by pino. Nest supplies the logger context as
 * the first optional parameter, so it is promoted to a structured field
 * rather than being flattened into the message text.
 */
export class StructuredLoggerService implements LoggerService {
  private readonly logger = pino();

  log(message: any, ...optionalParams: any[]): void {
    this.write('info', message, optionalParams);
  }

  error(message: any, ...optionalParams: any[]): void {
    this.write('error', message, optionalParams);
  }

  warn(message: any, ...optionalParams: any[]): void {
    this.write('warn', message, optionalParams);
  }

  debug(message: any, ...optionalParams: any[]): void {
    this.write('debug', message, optionalParams);
  }

  verbose(message: any, ...optionalParams: any[]): void {
    this.write('debug', message, optionalParams);
  }

  fatal(message: any, ...optionalParams: any[]): void {
    this.write('fatal', message, optionalParams);
  }

  setLogLevels(levels: LogLevel[]): void {
    if (levels.length === 0) {
      this.logger.level = 'silent';
    } else if (levels.includes('verbose') || levels.includes('debug')) {
      this.logger.level = 'debug';
    } else if (levels.includes('log')) {
      this.logger.level = 'info';
    } else if (levels.includes('warn')) {
      this.logger.level = 'warn';
    } else if (levels.includes('error')) {
      this.logger.level = 'error';
    } else {
      this.logger.level = 'fatal';
    }
  }

  private write(
    level: PinoLevel,
    message: any,
    optionalParams: any[],
  ): void {
    const fields: Record<string, unknown> = {};
    const context =
      typeof optionalParams[0] === 'string' ? optionalParams[0] : undefined;
    const requestId = currentRequestId();

    if (context) {
      fields.context = context;
    }
    if (requestId) {
      fields.requestId = requestId;
    }
    if (message instanceof Error) {
      fields.err = message;
    }

    const text = this.stringifyMessage(message);
    switch (level) {
      case 'fatal':
        this.logger.fatal(fields, text);
        break;
      case 'error':
        this.logger.error(fields, text);
        break;
      case 'warn':
        this.logger.warn(fields, text);
        break;
      case 'info':
        this.logger.info(fields, text);
        break;
      case 'debug':
        this.logger.debug(fields, text);
        break;
    }
  }

  private stringifyMessage(message: any): string {
    if (typeof message === 'string') {
      return message;
    }
    if (message instanceof Error) {
      return message.stack ?? message.message;
    }
    try {
      const serialized = JSON.stringify(message);
      return serialized === undefined ? String(message) : serialized;
    } catch {
      try {
        return String(message);
      } catch {
        return '[unserializable log message]';
      }
    }
  }
}
