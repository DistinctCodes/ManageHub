/* eslint-disable prettier/prettier */
import { Controller, Get, Param } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';

@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get(':userId')
  getLogs(@Param('userId') userId: string) {
    return this.auditLogsService.findByUser(userId);
  }
}
