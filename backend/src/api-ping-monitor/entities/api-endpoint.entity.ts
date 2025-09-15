import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { PingResult } from './ping-result.entity';

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
}

export enum EndpointStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PAUSED = 'paused',
}

export enum ApiProvider {
  STRIPE = 'stripe',
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
  TWITTER = 'twitter',
  GITHUB = 'github',
  SLACK = 'slack',
  DISCORD = 'discord',
  ZOOM = 'zoom',
  PAYPAL = 'paypal',
  AWS = 'aws',
  AZURE = 'azure',
  MAILGUN = 'mailgun',
  SENDGRID = 'sendgrid',
  TWILIO = 'twilio',
  CUSTOM = 'custom',
}

@Entity('api_endpoints')
@Index(['status'])
@Index(['provider'])
@Index(['isActive'])
@Index(['createdAt'])
export class ApiEndpoint {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  name: string;

  @Column({ length: 500 })
  description: string;

  @Column({ length: 2048 })
  url: string;

  @Column({
    type: 'enum',
    enum: HttpMethod,
    default: HttpMethod.GET,
  })
  method: HttpMethod;

  @Column({
    type: 'enum',
    enum: ApiProvider,
    default: ApiProvider.CUSTOM,
  })
  provider: ApiProvider;

  @Column({ type: 'json', nullable: true })
  headers: Record<string, string>;

  @Column({ type: 'text', nullable: true })
  body: string;

  @Column({ type: 'int', default: 30000 })
  timeoutMs: number;

  @Column({ type: 'int', default: 300 })
  intervalSeconds: number; // How often to ping (in seconds)

  @Column({ type: 'int', default: 5 })
  retryAttempts: number;

  @Column({ type: 'int', default: 1000 })
  retryDelayMs: number;

  @Column({ type: 'json', nullable: true })
  expectedResponse: {
    statusCode?: number;
    contentType?: string;
    bodyContains?: string;
    maxResponseTimeMs?: number;
  };

  @Column({
    type: 'enum',
    enum: EndpointStatus,
    default: EndpointStatus.ACTIVE,
  })
  status: EndpointStatus;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: true })
  enableAlerts: boolean;

  @Column({ type: 'json', nullable: true })
  alertConfig: {
    consecutiveFailures?: number;
    responseTimeThresholdMs?: number;
    uptimeThreshold?: number;
    emailNotifications?: string[];
    slackWebhook?: string;
    webhookUrl?: string;
    notifyOnRecovery?: boolean;
  };

  @Column({ length: 255, nullable: true })
  tags: string; // Comma-separated tags

  @Column({ length: 255 })
  createdBy: string;

  @Column({ length: 255, nullable: true })
  updatedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  lastPingAt: Date;

  @Column({ type: 'datetime', nullable: true })
  nextPingAt: Date;

  @OneToMany(() => PingResult, pingResult => pingResult.endpoint)
  pingResults: PingResult[];

  // Computed properties
  get isHealthy(): boolean {
    if (!this.pingResults || this.pingResults.length === 0) {
      return true; // No data yet, assume healthy
    }

    const recentResults = this.pingResults
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);

    return recentResults.every(result => result.isSuccess);
  }

  get currentStatus(): 'healthy' | 'degraded' | 'down' | 'unknown' {
    if (!this.pingResults || this.pingResults.length === 0) {
      return 'unknown';
    }

    const recentResults = this.pingResults
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    const successCount = recentResults.filter(result => result.isSuccess).length;
    const successRate = successCount / recentResults.length;

    if (successRate >= 0.9) return 'healthy';
    if (successRate >= 0.5) return 'degraded';
    return 'down';
  }

  get averageResponseTime(): number {
    if (!this.pingResults || this.pingResults.length === 0) {
      return 0;
    }

    const recentSuccessfulResults = this.pingResults
      .filter(result => result.isSuccess && result.responseTimeMs)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 50);

    if (recentSuccessfulResults.length === 0) return 0;

    const totalResponseTime = recentSuccessfulResults.reduce(
      (sum, result) => sum + result.responseTimeMs,
      0
    );

    return Math.round(totalResponseTime / recentSuccessfulResults.length);
  }

  get uptimePercentage(): number {
    if (!this.pingResults || this.pingResults.length === 0) {
      return 100;
    }

    const last24Hours = new Date();
    last24Hours.setHours(last24Hours.getHours() - 24);

    const recentResults = this.pingResults.filter(
      result => result.createdAt > last24Hours
    );

    if (recentResults.length === 0) return 100;

    const successCount = recentResults.filter(result => result.isSuccess).length;
    return Math.round((successCount / recentResults.length) * 100 * 100) / 100;
  }

  getNextPingTime(): Date {
    const now = new Date();
    const nextPing = new Date(now.getTime() + (this.intervalSeconds * 1000));
    return nextPing;
  }

  shouldPing(): boolean {
    if (!this.isActive || this.status !== EndpointStatus.ACTIVE) {
      return false;
    }

    if (!this.nextPingAt) {
      return true; // Never been pinged
    }

    return new Date() >= this.nextPingAt;
  }
}