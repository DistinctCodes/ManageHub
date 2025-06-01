import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { ClockinModule } from './clock-in/clock-in.module';
import { UploadsModule } from './uploads/uploads.module';
import { CacheModule } from '@nestjs/cache-manager';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    AuthModule,
    AuditLogModule,
    ClockinModule,
    UploadsModule,
    CacheModule.register({
      ttl: 60, // default TTL 1 min
      isGlobal: true,
    }),
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
