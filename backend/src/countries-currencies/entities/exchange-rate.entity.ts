import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Currency } from './currency.entity';

@Entity('exchange_rates')
export class ExchangeRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fromCurrencyId: string;

  @Column()
  toCurrencyId: string;

  @Column({ type: 'decimal', precision: 15, scale: 6 })
  rate: number; // Exchange rate from fromCurrency to toCurrency

  @Column({ type: 'timestamptz' })
  effectiveDate: Date; // Date when this rate becomes effective

  @Column({ type: 'timestamptz', nullable: true })
  expiryDate?: Date; // Optional expiry date for the rate

  @Column({ nullable: true })
  source?: string; // Source of the exchange rate (e.g., 'ECB', 'Federal Reserve')

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isDeleted: boolean;

  @ManyToOne(() => Currency, (currency) => currency.fromExchangeRates)
  @JoinColumn({ name: 'fromCurrencyId' })
  fromCurrency: Currency;

  @ManyToOne(() => Currency, (currency) => currency.toExchangeRates)
  @JoinColumn({ name: 'toCurrencyId' })
  toCurrency: Currency;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
