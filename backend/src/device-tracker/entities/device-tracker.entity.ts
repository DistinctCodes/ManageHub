import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum DeviceStatus {
  ACTIVE = 'active',
  BLOCKED = 'blocked',
  SUSPICIOUS = 'suspicious',
  INACTIVE = 'inactive',
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum DeviceType {
  DESKTOP = 'desktop',
  MOBILE = 'mobile',
  TABLET = 'tablet',
  LAPTOP = 'laptop',
  UNKNOWN = 'unknown',
}

@Entity('device_trackers')
@Index(['deviceType', 'ipAddress'])
@Index(['userId'])
@Index(['status', 'riskLevel'])
@Index(['countryCode', 'city'])
export class DeviceTracker {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', nullable: true })
  userId?: string;

  @Column({ name: 'device_type', type: 'enum', enum: DeviceType })
  deviceType: DeviceType;

  @Column({ name: 'ip_address' })
  ipAddress: string;

  @Column({ type: 'text', nullable: true })
  location?: string;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent?: string;

  @Column({ name: 'device_fingerprint', nullable: true })
  deviceFingerprint?: string;

  @Column({ name: 'is_trusted', default: false })
  isTrusted: boolean;

  @Column({ name: 'status', type: 'enum', enum: DeviceStatus, default: DeviceStatus.ACTIVE })
  status: DeviceStatus;

  @Column({ name: 'risk_level', type: 'enum', enum: RiskLevel, default: RiskLevel.LOW })
  riskLevel: RiskLevel;

  @Column({ name: 'risk_score', type: 'int', default: 0 })
  riskScore: number;

  @Column({ name: 'login_count', type: 'int', default: 0 })
  loginCount: number;

  @Column({ name: 'failed_attempts', type: 'int', default: 0 })
  failedAttempts: number;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true })
  lastLoginAt?: Date;

  @Column({ name: 'last_seen_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  lastSeenAt: Date;

  // Geolocation fields
  @Column({ name: 'country_code', length: 2, nullable: true })
  countryCode?: string;

  @Column({ name: 'country_name', nullable: true })
  countryName?: string;

  @Column({ name: 'region', nullable: true })
  region?: string;

  @Column({ name: 'city', nullable: true })
  city?: string;

  @Column({ name: 'latitude', type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude?: number;

  @Column({ name: 'longitude', type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude?: number;

  @Column({ name: 'timezone', nullable: true })
  timezone?: string;

  @Column({ name: 'isp', nullable: true })
  isp?: string;

  @Column({ name: 'organization', nullable: true })
  organization?: string;

  // Browser/Device details
  @Column({ name: 'browser_name', nullable: true })
  browserName?: string;

  @Column({ name: 'browser_version', nullable: true })
  browserVersion?: string;

  @Column({ name: 'os_name', nullable: true })
  osName?: string;

  @Column({ name: 'os_version', nullable: true })
  osVersion?: string;

  @Column({ name: 'device_model', nullable: true })
  deviceModel?: string;

  @Column({ name: 'device_vendor', nullable: true })
  deviceVendor?: string;

  // Security flags
  @Column({ name: 'is_vpn', default: false })
  isVpn: boolean;

  @Column({ name: 'is_proxy', default: false })
  isProxy: boolean;

  @Column({ name: 'is_tor', default: false })
  isTor: boolean;

  @Column({ name: 'is_hosting', default: false })
  isHosting: boolean;

  @Column({ name: 'is_mobile', default: false })
  isMobile: boolean;

  // Audit fields
  @Column({ name: 'blocked_at', type: 'timestamp', nullable: true })
  blockedAt?: Date;

  @Column({ name: 'blocked_by', nullable: true })
  blockedBy?: string;

  @Column({ name: 'blocked_reason', type: 'text', nullable: true })
  blockedReason?: string;

  @Column({ name: 'notes', type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}