import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("visitors")
export class Visitor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "full_name", length: 100 })
  fullName: string;

  @Column({ name: "visit_reason", length: 500 })
  visitReason: string;

  @Column({ name: "entry_time", type: "timestamp" })
  entryTime: Date;

  @Column({ name: "exit_time", type: "timestamp", nullable: true })
  exitTime: Date | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
