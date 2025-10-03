import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
} from 'typeorm';
import { Currency } from './currency.entity';

@Entity('countries')
export class Country {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 2 })
  iso2Code: string; // ISO 3166-1 alpha-2 (e.g., 'US', 'CA', 'GB')

  @Column({ unique: true, length: 3 })
  iso3Code: string; // ISO 3166-1 alpha-3 (e.g., 'USA', 'CAN', 'GBR')

  @Column({ length: 100 })
  name: string; // Full country name

  @Column({ length: 100, nullable: true })
  commonName?: string; // Common name (e.g., 'United States' vs 'United States of America')

  @Column({ nullable: true })
  numericCode?: string; // ISO 3166-1 numeric code

  @Column({ length: 10, nullable: true })
  callingCode?: string; // Country calling code (e.g., '+1')

  @Column({ length: 50, nullable: true })
  capital?: string; // Capital city

  @Column({ length: 50, nullable: true })
  region?: string; // Geographic region

  @Column({ length: 50, nullable: true })
  subregion?: string; // Geographic subregion

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  area?: number; // Area in square kilometers

  @Column({ type: 'int', nullable: true })
  population?: number; // Population count

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isDeleted: boolean;

  @OneToMany(() => Currency, (currency) => currency.country)
  currencies: Currency[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date;
}
