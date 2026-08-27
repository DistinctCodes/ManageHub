import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bull';
import { CacheModule } from '@nestjs/cache-manager';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PaymentsModule } from './payments/payments.module';
import { WalletsModule } from './wallets/wallets.module';
import { CreditsModule } from './credits/credits.module';
import { AdminAuditModule } from './admin-audit/admin-audit.module';
import { MetricsService } from './common/metrics.service';
import { RequestContextMiddleware } from './common/request-context.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.register({
      isGlobal: true,
      ttl: 60_000,
      max: 1_000,
    }),
    // Powers ReconciliationService's @Cron job (issue #1572).
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100,
      },
    ]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DATABASE_HOST'),
        port: config.get<number>('DATABASE_PORT', 5432),
        username: config.get<string>('DATABASE_USERNAME'),
        password: config.get<string>('DATABASE_PASSWORD'),
        database: config.get<string>('DATABASE_NAME'),
        autoLoadEntities: true,
        synchronize: false,
      }),
    }),
    // Backs the Soroban escrow submission queue (issue #1574) — see
    // PaymentsModule — on the same Redis instance .env.example already
    // documents for Bull-backed background jobs. The queue is registered
    // regardless of SOROBAN_ENABLED (ioredis retries quietly in the
    // background if Redis isn't reachable rather than blocking app
    // startup); no job is ever added to it unless the Soroban rail is
    // actually enabled and something calls it.
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
          db: config.get<number>('REDIS_DB', 0),
        },
      }),
    }),
    AuthModule,
    PaymentsModule,
    WalletsModule,
    // Micropayment credit ledger, revenue splits and batch settlement
    // (issue #1575). Its own @Cron jobs ride the ScheduleModule above.
    CreditsModule,
    // Structured audit trail for admin actions (issue #1612). Consumed by
    // the payments and credits admin controllers; read via /admin/audit.
    AdminAuditModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    MetricsService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes('*');
  }
}
