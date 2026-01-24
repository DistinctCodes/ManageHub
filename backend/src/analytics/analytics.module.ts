import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as redisStore from 'cache-manager-ioredis';

// Controller
import { AnalyticsController } from './analytics.controller';

// Main Service
import { AnalyticsService } from './analytics.service';

// Analytics Services
import { AttendanceAnalyticsService } from './services/attendance-analytics.service';
import { RevenueAnalyticsService } from './services/revenue-analytics.service';
import { MemberAnalyticsService } from './services/member-analytics.service';
import { OccupancyAnalyticsService } from './services/occupancy-analytics.service';

// Exporters
import { CsvExporterService } from './exporters/csv-exporter.service';
import { ExcelExporterService } from './exporters/excel-exporter.service';
import { PdfExporterService } from './exporters/pdf-exporter.service';

// Entities
import { Attendance } from '../attendance/entities/attendance.entity';
import { User } from '../users/entities/user.entity';
import { Staff } from '../staff/entities/staff.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Attendance, User, Staff]),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        store: redisStore,
        host: configService.get<string>('REDIS_HOST') || 'localhost',
        port: configService.get<number>('REDIS_PORT') || 6379,
        password: configService.get<string>('REDIS_PASSWORD'),
        db: configService.get<number>('REDIS_DB') || 0,
        ttl: 300, // 5 minutes default TTL
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    AttendanceAnalyticsService,
    RevenueAnalyticsService,
    MemberAnalyticsService,
    OccupancyAnalyticsService,
    CsvExporterService,
    ExcelExporterService,
    PdfExporterService,
  ],
  exports: [
    AnalyticsService,
    AttendanceAnalyticsService,
    RevenueAnalyticsService,
    MemberAnalyticsService,
    OccupancyAnalyticsService,
  ],
})
export class AnalyticsModule {}
