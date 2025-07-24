import {
  Controller,
  Get,
  Post,
  Body,
  Query,
} from '@nestjs/common';
import { InternetSpeedService } from './internet-speed.service';
import { CreateInternetSpeedDto } from './dto/create-internet-speed.dto';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Internet Speed')
@Controller('internet-speed')
export class InternetSpeedController {
  constructor(private readonly speedService: InternetSpeedService) {}

  @Post()
  @ApiOperation({ summary: 'Record new internet speed test result' })
  create(@Body() dto: CreateInternetSpeedDto) {
    return this.speedService.recordSpeed(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all internet speed results' })
  @ApiQuery({ name: 'location', required: false })
  findAll(@Query('location') location?: string) {
    return this.speedService.getAll(location);
  }
}