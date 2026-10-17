import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class NoCacheInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Skip health endpoint
    if (request.path === '/health' || request.path.startsWith('/health/')) {
      return next.handle();
    }

    // Set cache control headers for all API responses
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('Pragma', 'no-cache');

    return next.handle();
  }
}
