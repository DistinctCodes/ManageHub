import { Body, Controller, Get, Post } from "@nestjs/common";
import { CreateBookDto } from "./dto/createBook.dto";
import { LibraryService } from "./library.service";
import { LogBookActionDto } from "./dto/LogbookAction.dto";
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';


@ApiTags('Library')
@Controller('library')
export class LibraryController {
  constructor(private readonly libraryService: LibraryService) {}

  @Post('book')
  @ApiOperation({ summary: 'Add a new book to the library' })
  create(@Body() dto: CreateBookDto) {
    return this.libraryService.createBook(dto);
  }

  @Get('book')
  @ApiOperation({ summary: 'Fetch all books' })
  findAll() {
    return this.libraryService.findAllBooks();
  }

  @Post('log')
  @ApiOperation({ summary: 'Log checkout/return action' })
  logAction(@Body() dto: LogBookActionDto) {
    return this.libraryService.logBookAction(dto);
  }

  @Get('logs')
  @ApiOperation({ summary: 'Fetch all book action logs' })
  getLogs() {
    return this.libraryService.getLogs();
  }
}