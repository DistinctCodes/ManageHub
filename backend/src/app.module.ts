import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { ClockinModule } from './clock-in/clock-in.module';
import { UploadsModule } from './uploads/uploads.module';

@Module({
  imports: [AuthModule, AuditLogModule, ClockinModule, UploadsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}