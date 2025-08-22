import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { DonationsService } from './donations.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { Donation } from './entities/donation.entity';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('donations')
@Controller('donations')
export class DonationsController {
  constructor(private readonly donationsService: DonationsService) {}

  @Post()
  async create(@Body() dto: CreateDonationDto): Promise<Donation> {
    return this.donationsService.create(dto);
  }

  @Get()
  async findAll(): Promise<Donation[]> {
    return this.donationsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Donation> {
    return this.donationsService.findOne(id);
  }
}
