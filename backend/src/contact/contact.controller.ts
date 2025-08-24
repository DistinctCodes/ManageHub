// src/contact/controllers/contact.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ValidationPipe,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { SearchContactDto } from './dto/search-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { ContactType } from './entities/contact.entity';

@Controller('contacts')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body(ValidationPipe) createContactDto: CreateContactDto) {
    return this.contactService.create(createContactDto);
  }

  @Get()
  findAll(@Query(ValidationPipe) searchDto: SearchContactDto) {
    const page = searchDto.page ? parseInt(searchDto.page, 10) : 1;
    const limit = searchDto.limit ? parseInt(searchDto.limit, 10) : 10;

    return this.contactService.findAll(
      searchDto.search,
      searchDto.type,
      page,
      limit,
    );
  }

  @Get('stats')
  getStats() {
    return this.contactService.getContactStats();
  }

  @Get('by-type/:type')
  getByType(@Param('type') type: ContactType) {
    return this.contactService.getContactsByType(type);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.contactService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateContactDto: UpdateContactDto,
  ) {
    return this.contactService.update(id, updateContactDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.contactService.remove(id);
  }
}
