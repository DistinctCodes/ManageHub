// src/lost-and-found/lost-and-found.controller.ts
import { Controller, Post, Get, Param, Body } from '@nestjs/common';
import { LostAndFoundService } from './lost-and-found.service';
import { CreateLostItemDto } from './dto/create-lost-item.dto';
import { ClaimLostItemDto } from './dto/claim-lost-item.dto';

@Controller('lost-and-found')
export class LostAndFoundController {
  constructor(private readonly lostAndFoundService: LostAndFoundService) {}

  @Post('report')
  reportItem(@Body() dto: CreateLostItemDto) {
    return this.lostAndFoundService.reportItem(dto);
  }

  @Get()
  findAll() {
    return this.lostAndFoundService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.lostAndFoundService.findOne(id);
  }

  @Post(':id/claim')
  claimItem(@Param('id') id: string, @Body() dto: ClaimLostItemDto) {
    return this.lostAndFoundService.claimItem(id, dto);
  }
}
