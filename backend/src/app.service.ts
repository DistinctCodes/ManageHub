import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';

@Injectable()
export class AppService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
  ) {}

  async getHealth(): Promise<{
    status: 'ok' | 'degraded' | 'unhealthy';
    dependencies: {
      postgres: { status: 'up' | 'down'; detail?: string };
      redis: { status: 'up' | 'down'; detail?: string };
    };
  }> {
    const [postgres, redis] = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
    ]);

    const failed = [postgres, redis].filter((entry) => entry.status === 'down');
    const status =
      failed.length === 0
        ? 'ok'
        : failed.length === 2
          ? 'unhealthy'
          : 'degraded';

    return { status, dependencies: { postgres, redis } };
  }

  private async checkPostgres(): Promise<{
    status: 'up' | 'down';
    detail?: string;
  }> {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'up' };
    } catch (error) {
      return {
        status: 'down',
        detail:
          error instanceof Error ? error.message : 'Postgres connection failed',
      };
    }
  }

  private async checkRedis(): Promise<{
    status: 'up' | 'down';
    detail?: string;
  }> {
    const client = new Redis({
      host: this.config.get<string>('REDIS_HOST', 'localhost'),
      port: this.config.get<number>('REDIS_PORT', 6379),
      password: this.config.get<string>('REDIS_PASSWORD') || undefined,
      db: this.config.get<number>('REDIS_DB', 0),
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });

    try {
      await client.connect();
      await client.ping();
      await client.quit();
      return { status: 'up' };
    } catch (error) {
      try {
        await client.disconnect();
      } catch {
        // best effort cleanup
      }
      return {
        status: 'down',
        detail:
          error instanceof Error ? error.message : 'Redis connection failed',
      };
    }
  }
}
