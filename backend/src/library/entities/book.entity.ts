import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { BookLog } from "./boolLog.entity";

@Entity()
export class Book {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  author: string;

  @Column({ nullable: true })
  description: string;

  @Column()
  isbn: string;

  @Column({ default: true })
  available: boolean;

  @OneToMany(() => BookLog, log => log.book)
  logs: BookLog[];
}