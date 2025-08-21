import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Survey } from './survey.entity';

export enum QuestionType {
  TEXT = 'text',
  SINGLE_CHOICE = 'single_choice',
  MULTIPLE_CHOICE = 'multiple_choice',
  RATING = 'rating',
}

@Entity()
export class Question {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  text: string;

  @Column({
    type: 'varchar',
    enum: QuestionType,
    default: QuestionType.TEXT,
  })
  type: QuestionType;

  @Column('simple-json', { nullable: true })
  options: string[];

  @Column({ default: false })
  isRequired: boolean;

  @Column({ default: 0 })
  order: number;

  @ManyToOne(() => Survey, (survey) => survey.questions, { onDelete: 'CASCADE' })
  @JoinColumn()
  survey: Survey;

  @Column()
  surveyId: string;

  // Forward reference to responses instead of importing Response entity
  @OneToMany('Response', 'question')
  responses: any[];
}
