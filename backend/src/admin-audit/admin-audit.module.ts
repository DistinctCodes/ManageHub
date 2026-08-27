import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminActionLog } from './admin-action-log.entity';
import { AdminActionLogService } from './admin-action-log.service';
import { AdminAuditController } from './admin-audit.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AdminActionLog])],
  controllers: [AdminAuditController],
  providers: [AdminActionLogService],
  exports: [AdminActionLogService],
})
export class AdminAuditModule {}
