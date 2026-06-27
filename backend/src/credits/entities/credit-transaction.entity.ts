import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn,
} from 'typeorm';
import { UserCredit } from './user-credit.entity';
import { CreditTransactionType } from '../enums/credit-transaction-type.enum';

@Entity('credit_transactions')
export class UserCreditTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  userCreditId: string;

  @ManyToOne(() => UserCredit)
  @JoinColumn({ name: 'userCreditId' })
  userCredit: UserCredit;

  @Column({ type: 'enum', enum: CreditTransactionType })
  type: CreditTransactionType;

  @Column({ type: 'decimal', precision: 8, scale: 2 })
  hours: number;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
