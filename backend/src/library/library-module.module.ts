import { Module } from '@nestjs/common';
import { LibraryController } from './library.controller';
import { LibraryService } from './library.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Book } from './entities/book.entity';
import { BookLog } from './entities/boolLog.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Book, BookLog])],
    providers: [LibraryService],
  controllers: [LibraryController]
})
export class LibraryModule {}
