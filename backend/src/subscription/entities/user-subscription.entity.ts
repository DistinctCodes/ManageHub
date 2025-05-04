import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from "typeorm"
import { SubscriptionPlan } from "./subscription-plan.entity"

@Entity()
export class UserSubscription {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  userId: string

  @Column()
  planId: string

  @ManyToOne(() => SubscriptionPlan)
  @JoinColumn({ name: "planId" })
  plan: SubscriptionPlan

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  startDate: Date

  @Column({ type: "timestamp" })
  endDate: Date

  @Column({ default: true })
  isActive: boolean

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  updatedAt: Date
}
