import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export enum AlertSeverity {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum AlertStatus {
  ACTIVE = "active",
  RESOLVED = "resolved",
  EXPIRED = "expired",
}

@Entity("emergency_alerts")
export class EmergencyAlert {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ length: 255 })
  title: string;

  @Column("text")
  message: string;

  @Column({
    type: "enum",
    enum: AlertSeverity,
    default: AlertSeverity.MEDIUM,
  })
  severity: AlertSeverity;

  @Column({
    type: "enum",
    enum: AlertStatus,
    default: AlertStatus.ACTIVE,
  })
  status: AlertStatus;

  @Column({ length: 100, nullable: true })
  category: string;

  @Column("json", { nullable: true })
  metadata: Record<string, any>;

  @Column({ type: "timestamp", nullable: true })
  expiresAt: Date;

  @Column({ type: "timestamp", nullable: true })
  resolvedAt: Date;

  @Column({ length: 100, nullable: true })
  resolvedBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
