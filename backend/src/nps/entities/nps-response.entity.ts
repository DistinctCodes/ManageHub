import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Unique,
} from 'typeorm';

@Entity('nps_responses')
@Unique(['userId', 'surveyPeriod'])
export class NpsResponse {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column({ type: 'int', min: 0, max: 10 })
  score: number;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column()
  surveyPeriod: string;

  @CreateDateColumn()
  createdAt: Date;
}
