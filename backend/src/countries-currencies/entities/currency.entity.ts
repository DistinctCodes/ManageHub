import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  OneToMany,
} from 'typeorm';
import { Country } from './country.entity';
import { ExchangeRate } from './exchange-rate.entity';

@Entity('currencies')
export class Currency {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 3 })
  code: string; // ISO 4217 currency code (e.g., 'USD', 'EUR', 'GBP')

  @Column({ length: 100 })
  name: string; // Full currency name

  @Column({ length: 10, nullable: true })
  symbol?: string; // Currency symbol (e.g., '$', '€', '£')

  @Column({ type: 'decimal', precision: 10, scale: 4, default: 1.0 })
  exchangeRate: number; // Exchange rate to base currency (USD)

  @Column({ default: false })
  isBaseCurrency: boolean; // Whether this is the base currency (USD)

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isDeleted: boolean;

  @Column({ type: 'int', default: 2 })
  decimalPlaces: number; // Number of decimal places for this currency

  @Column({ nullable: true })
  countryId?: string; // Optional link to country

  @ManyToOne(() => Country, (country) => country.currencies, { nullable: true })
  @JoinColumn({ name: 'countryId' })
  country?: Country;

  @OneToMany(() => ExchangeRate, (exchangeRate) => exchangeRate.fromCurrency)
  fromExchangeRates: ExchangeRate[];

  @OneToMany(() => ExchangeRate, (exchangeRate) => exchangeRate.toCurrency)
  toExchangeRates: ExchangeRate[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
