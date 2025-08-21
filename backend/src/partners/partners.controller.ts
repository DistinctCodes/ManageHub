import { Controller, Get, Post, Body, Patch, Param, Delete, Query, ParseUUIDPipe } from '@nestjs/common';
import { PartnersService } from './partners.service';
import { CreatePartnerDto, UpdatePartnerDto } from './dto/partner.dto';
import { CreatePartnerContactDto, UpdatePartnerContactDto } from './dto/partner-contact.dto';
import { CreatePartnerServiceDto, UpdatePartnerServiceDto } from './dto/partner-service.dto';
import { Partner } from './entities/partner.entity';
import { PartnerContact } from './entities/partner-contact.entity';
import { PartnerService } from './entities/partner-service.entity';

@Controller('partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  @Post()
  create(@Body() createPartnerDto: CreatePartnerDto): Promise<Partner> {
    return this.partnersService.create(createPartnerDto);
  }

  @Get()
  findAll(@Query('active') active?: string): Promise<Partner[]> {
    const activeOnly = active === 'true';
    return this.partnersService.findAll(activeOnly);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Partner> {
    return this.partnersService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updatePartnerDto: UpdatePartnerDto,
  ): Promise<Partner> {
    return this.partnersService.update(id, updatePartnerDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.partnersService.remove(id);
  }

  // Contact management endpoints
  @Post(':id/contacts')
  addContact(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createContactDto: CreatePartnerContactDto,
  ): Promise<PartnerContact> {
    return this.partnersService.addContact(id, createContactDto);
  }

  @Patch('contacts/:id')
  updateContact(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateContactDto: UpdatePartnerContactDto,
  ): Promise<PartnerContact> {
    return this.partnersService.updateContact(id, updateContactDto);
  }

  @Delete('contacts/:id')
  removeContact(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.partnersService.removeContact(id);
  }

  // Service management endpoints
  @Post(':id/services')
  addService(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() createServiceDto: CreatePartnerServiceDto,
  ): Promise<PartnerService> {
    return this.partnersService.addService(id, createServiceDto);
  }

  @Patch('services/:id')
  updateService(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateServiceDto: UpdatePartnerServiceDto,
  ): Promise<PartnerService> {
    return this.partnersService.updateService(id, updateServiceDto);
  }

  @Delete('services/:id')
  removeService(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.partnersService.removeService(id);
  }
}
