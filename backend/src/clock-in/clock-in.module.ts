import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Clockin } from './entities/clock-in.entity';
import { ClockinService } from './clock-in.service';
import { ClockinController } from './clock-in.controller';
import { AuditLogModule } from '../audit-log/audit-log.module';

@Module({
  imports: [TypeOrmModule.forFeature([Clockin]), AuditLogModule],
  providers: [ClockinService],
  controllers: [ClockinController],
})
export class ClockinModule {}
