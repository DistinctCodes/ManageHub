import { Entity, PrimaryGeneratedColumn, Column } from "typeorm"

@Entity()
export class SubscriptionPlan {
  @PrimaryGeneratedColumn("uuid")
  id: string

  @Column()
  name: string

  @Column("decimal", { precision: 10, scale: 2 })
  price: number

  @Column()
  duration: number // in days

  @Column("simple-array")
  features: string[]

  @Column({ default: true })
  isActive: boolean

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  updatedAt: Date
}
