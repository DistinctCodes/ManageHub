import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApiEndpoint } from './api-endpoint.entity';

export enum PingStatus {
  SUCCESS = 'success',
  TIMEOUT = 'timeout',
  CONNECTION_ERROR = 'connection_error',
  DNS_ERROR = 'dns_error',
  SSL_ERROR = 'ssl_error',
  HTTP_ERROR = 'http_error',
  VALIDATION_ERROR = 'validation_error',
  UNKNOWN_ERROR = 'unknown_error',
}

@Entity('ping_results')
@Index(['endpointId'])
@Index(['status'])
@Index(['isSuccess'])
@Index(['createdAt'])
@Index(['endpointId', 'createdAt'])
export class PingResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  endpointId: string;

  @Column({
    type: 'enum',
    enum: PingStatus,
  })
  status: PingStatus;

  @Column({ type: 'int', nullable: true })
  httpStatusCode: number;

  @Column({ type: 'int', nullable: true })
  responseTimeMs: number;

  @Column({ type: 'int', nullable: true })
  dnsLookupTimeMs: number;

  @Column({ type: 'int', nullable: true })
  tcpConnectionTimeMs: number;

  @Column({ type: 'int', nullable: true })
  tlsHandshakeTimeMs: number;

  @Column({ type: 'int', nullable: true })
  firstByteTimeMs: number;

  @Column({ type: 'int', nullable: true })
  contentTransferTimeMs: number;

  @Column({ type: 'text', nullable: true })
  responseHeaders: string; // JSON string

  @Column({ type: 'text', nullable: true })
  responseBody: string;

  @Column({ type: 'int', nullable: true })
  responseSize: number; // in bytes

  @Column({ type: 'text', nullable: true })
  errorMessage: string;

  @Column({ type: 'text', nullable: true })
  errorDetails: string; // JSON string with error stack, etc.

  @Column({ default: false })
  isSuccess: boolean;

  @Column({ default: false })
  isTimeout: boolean;

  @Column({ default: false })
  alertSent: boolean;

  @Column({ type: 'int', default: 1 })
  attemptNumber: number;

  @Column({ type: 'json', nullable: true })
  validationResults: {
    statusCodeValid?: boolean;
    contentTypeValid?: boolean;
    bodyContainsValid?: boolean;
    responseTimeValid?: boolean;
    details?: string[];
  };

  @Column({ type: 'json', nullable: true })
  metadata: {
    userAgent?: string;
    location?: string;
    serverRegion?: string;
    cdnProvider?: string;
    [key: string]: any;
  };

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => ApiEndpoint, endpoint => endpoint.pingResults, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'endpointId' })
  endpoint: ApiEndpoint;

  // Computed properties
  get isHealthy(): boolean {
    return this.isSuccess && !this.isTimeout && this.httpStatusCode >= 200 && this.httpStatusCode < 400;
  }

  get performanceGrade(): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (!this.isSuccess || !this.responseTimeMs) return 'F';
    
    if (this.responseTimeMs <= 200) return 'A';
    if (this.responseTimeMs <= 500) return 'B';
    if (this.responseTimeMs <= 1000) return 'C';
    if (this.responseTimeMs <= 2000) return 'D';
    return 'F';
  }

  get statusCategory(): 'success' | 'client_error' | 'server_error' | 'network_error' | 'unknown' {
    if (this.isSuccess && this.httpStatusCode >= 200 && this.httpStatusCode < 300) {
      return 'success';
    }
    
    if (this.httpStatusCode >= 400 && this.httpStatusCode < 500) {
      return 'client_error';
    }
    
    if (this.httpStatusCode >= 500) {
      return 'server_error';
    }
    
    if ([PingStatus.TIMEOUT, PingStatus.CONNECTION_ERROR, PingStatus.DNS_ERROR].includes(this.status)) {
      return 'network_error';
    }
    
    return 'unknown';
  }

  getFormattedResponseTime(): string {
    if (!this.responseTimeMs) return 'N/A';
    
    if (this.responseTimeMs < 1000) {
      return `${this.responseTimeMs}ms`;
    }
    
    return `${(this.responseTimeMs / 1000).toFixed(2)}s`;
  }

  getErrorSummary(): string {
    if (this.isSuccess) return 'Success';
    
    if (this.errorMessage) {
      return this.errorMessage.length > 100 
        ? this.errorMessage.substring(0, 100) + '...'
        : this.errorMessage;
    }
    
    switch (this.status) {
      case PingStatus.TIMEOUT:
        return 'Request timed out';
      case PingStatus.CONNECTION_ERROR:
        return 'Failed to connect to server';
      case PingStatus.DNS_ERROR:
        return 'DNS resolution failed';
      case PingStatus.SSL_ERROR:
        return 'SSL/TLS handshake failed';
      case PingStatus.HTTP_ERROR:
        return `HTTP ${this.httpStatusCode || 'error'}`;
      case PingStatus.VALIDATION_ERROR:
        return 'Response validation failed';
      default:
        return 'Unknown error';
    }
  }

  hasPerformanceIssue(): boolean {
    const endpoint = this.endpoint;
    if (!endpoint || !endpoint.expectedResponse) return false;
    
    const maxResponseTime = endpoint.expectedResponse.maxResponseTimeMs;
    if (maxResponseTime && this.responseTimeMs && this.responseTimeMs > maxResponseTime) {
      return true;
    }
    
    return false;
  }

  toSummary(): {
    id: string;
    status: PingStatus;
    isSuccess: boolean;
    responseTimeMs: number;
    httpStatusCode: number;
    errorMessage: string;
    createdAt: Date;
    performanceGrade: string;
  } {
    return {
      id: this.id,
      status: this.status,
      isSuccess: this.isSuccess,
      responseTimeMs: this.responseTimeMs || 0,
      httpStatusCode: this.httpStatusCode || 0,
      errorMessage: this.getErrorSummary(),
      createdAt: this.createdAt,
      performanceGrade: this.performanceGrade,
    };
  }
}