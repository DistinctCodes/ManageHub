import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { ClockInModule } from './clock-in/clock-in.module';

@Module({
  imports: [AuthModule, AuditLogModule, ClockInModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
