import { Module } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AuditLogController } from './audit-log.controller';

@Module({
  providers: [AuditLogService],
  controllers: [AuditLogController]
})
export class AuditLogModule {}
