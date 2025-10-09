import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Company } from '../../companies/entities/company.entity';
import { Branch } from '../../branches/entities/branch.entity';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  companyId: number;

  @Column({ nullable: true })
  branchId?: number;

  @ManyToOne(() => Company, (company) => company.departments)
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @ManyToOne(() => Branch, (branch) => branch.departments, { nullable: true })
  @JoinColumn({ name: 'branchId' })
  branch: Branch;
}
