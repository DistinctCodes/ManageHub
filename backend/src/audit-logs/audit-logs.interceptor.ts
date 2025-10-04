/* eslint-disable prettier/prettier */
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditLogsService } from './audit-logs.service';

@Injectable()
export class AuditLogsInterceptor implements NestInterceptor {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const user = req.user; // requires auth
    const { method, originalUrl, body, params, query } = req;

    return next.handle().pipe(
      tap(async (data) => {
        await this.auditLogsService.createLog({
          action: `${method} ${originalUrl}`,
          entity: params?.id ? originalUrl.split('/')[1] : null,
          entityId: params?.id,
          userId: user?.id || 'anonymous',
          details: { body, query, response: data },
        });
      }),
    );
  }
}
