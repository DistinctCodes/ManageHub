import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Asset } from 'src/assets/assets.entity';
import { Company } from 'src/companies/entities/company.entity';
import { Department } from 'src/departments/entities/department.entity';

@Entity('branches')
export class Branch {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  location: string;

  @Column()
  companyId: number;

  @ManyToOne(() => Company, (company) => company.branches, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'companyId' })
  company: Company;

  @OneToMany(() => Department, (department) => department.branch)
  departments: Department[];

  @OneToMany(() => Asset, (asset) => asset.branch)
  assets: Asset[];
}
