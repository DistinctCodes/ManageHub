import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Book } from "./book.entity";

export enum BookAction {
  CHECKOUT = 'CHECKOUT',
  RETURN = 'RETURN',
}

@Entity()
export class BookLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Book, book => book.logs, { eager: true })
  book: Book;

  @Column()
  userId: string; // mock user

  @Column({
    type: 'enum',
    enum: BookAction,
  })
  action: BookAction;

  @CreateDateColumn()
  timestamp: Date;
}