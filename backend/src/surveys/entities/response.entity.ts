import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Question } from './question.entity';

@Entity()
export class Response {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('simple-json')
  value: any;

  @Column()
  respondentId: string;

  @ManyToOne(() => Question, (question) => question.responses, { onDelete: 'CASCADE' })
  @JoinColumn()
  question: Question;

  @Column()
  questionId: string;

  @CreateDateColumn()
  createdAt: Date;
}
