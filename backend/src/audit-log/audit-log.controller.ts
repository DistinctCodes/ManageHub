import { Controller, Get, Query } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';

@Controller('audit-logs')
export class AuditLogController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Get()
  async getLogs(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('action') actionFilter?: string
  ) {
    return this.auditLogService.findAll(Number(page), Number(limit), actionFilter);
  }
}
