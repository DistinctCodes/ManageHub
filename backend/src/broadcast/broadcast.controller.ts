import { Controller, Post, Body, Get, Param, Patch } from '@nestjs/common';
import { BroadcastService } from './broadcast.service';
import { CreateBroadcastDto } from './dto/create-broadcast.dto';
import { UpdateBroadcastDto } from './dto/update-broadcast.dto';

@Controller('broadcasts')
export class BroadcastController {
  constructor(private readonly broadcastService: BroadcastService) {}

  @Post()
  create(@Body() dto: CreateBroadcastDto) {
    return this.broadcastService.create(dto);
  }

  @Get()
  findAll() {
    return this.broadcastService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.broadcastService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBroadcastDto) {
    return this.broadcastService.update(id, dto);
  }
}
