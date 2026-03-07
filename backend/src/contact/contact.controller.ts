<<<<<<< HEAD
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
=======
import { Body, Controller, Post, Req } from '@nestjs/common';
import { Throttle, seconds } from '@nestjs/throttler';
import { ContactService } from './contact.service';
import { SubmitContactDto } from './dto/submit-contact.dto';
import { Public } from '../auth/decorators/public.decorator';

type AnyRequest = { ip?: string; headers?: Record<string, unknown> };

@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Public()
  @Throttle({ contact: { ttl: seconds(60), limit: 5 } })
  @Post()
  async submit(@Body() dto: SubmitContactDto, @Req() req: AnyRequest) {
    const ip = this.getClientIp(req);
    return this.contactService.submit(dto, ip);
  }

  private getClientIp(req: AnyRequest): string | null {
    const xff = req.headers?.['x-forwarded-for'];
    if (typeof xff === 'string' && xff.length) return xff.split(',')[0].trim();
    return req.ip ?? null;
>>>>>>> b699381352da060233d0425e9066d02d3ff87855
  }
}
