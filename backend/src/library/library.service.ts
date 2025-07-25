import { InjectRepository } from "@nestjs/typeorm";
import { CreateBookDto } from "./dto/createBook.dto";
import { LogBookActionDto } from "./dto/LogbookAction.dto";
import { BookAction, BookLog } from "./entities/boolLog.entity";
import { Book } from "./entities/book.entity";
import { Repository } from "typeorm";
import { Injectable } from "@nestjs/common";

@Injectable()
export class LibraryService {
  constructor(
    @InjectRepository(Book) private bookRepo: Repository<Book>,
    @InjectRepository(BookLog) private logRepo: Repository<BookLog>,
  ) {}

  async createBook(dto: CreateBookDto): Promise<Book> {
    return this.bookRepo.save(this.bookRepo.create(dto));
  }

  async findAllBooks(): Promise<Book[]> {
    return this.bookRepo.find();
  }

  async logBookAction(dto: LogBookActionDto): Promise<BookLog> {
    const book = await this.bookRepo.findOneByOrFail({ id: dto.bookId });

    if (dto.action === BookAction.CHECKOUT) book.available = false;
    if (dto.action === BookAction.RETURN) book.available = true;

    await this.bookRepo.save(book);

    const log = this.logRepo.create({ ...dto, book });
    return this.logRepo.save(log);
  }

  async getLogs(): Promise<BookLog[]> {
    return this.logRepo.find({ order: { timestamp: 'DESC' } });
  }
}