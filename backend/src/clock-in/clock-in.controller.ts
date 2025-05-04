import { Controller, Post, Body } from '@nestjs/common';
import { ClockinService } from './clock-in.service';
import { CreateClockinDto } from './dto/create-clock-in.dto';

@Controller('clockin')
export class ClockinController {
  constructor(private readonly clockinService: ClockinService) {}

  @Post()
  async clockIn(@Body() data: CreateClockinDto) {
    return this.clockinService.clockIn(data);
  }
}
