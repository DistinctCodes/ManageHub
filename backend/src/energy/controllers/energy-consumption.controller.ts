import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Param,
  ValidationPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { EnergyConsumptionService } from '../services/energy-consumption.service';
import { CreateEnergyConsumptionDto } from '../dto/create-energy-consumption.dto';
import { QueryEnergyDto } from '../dto/query-energy.dto';

@Controller('energy-consumption')
export class EnergyConsumptionController {
  constructor(
    private readonly energyConsumptionService: EnergyConsumptionService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body(ValidationPipe) dto: CreateEnergyConsumptionDto) {
    return await this.energyConsumptionService.create(dto);
  }

  @Get()
  async findAll(@Query(ValidationPipe) query: QueryEnergyDto) {
    return await this.energyConsumptionService.findAll(query);
  }

  @Get('summary')
  async getSummary(@Query('workspaceId') workspaceId?: string) {
    return await this.energyConsumptionService.getSummary(workspaceId);
  }

  @Get(':workspaceId/:date')
  async findByWorkspaceAndDate(
    @Param('workspaceId') workspaceId: string,
    @Param('date') date: string,
  ) {
    return await this.energyConsumptionService.findByWorkspaceAndDate(
      workspaceId,
      date,
    );
  }

  @Post('generate-mock-data')
  @HttpCode(HttpStatus.ACCEPTED)
  async generateMockData(
    @Body() body: { startDate: string; endDate: string },
  ) {
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);
    
    // Run in background
    this.energyConsumptionService.generateMockDataForDateRange(startDate, endDate);
    
    return {
      message: 'Mock data generation started',
      startDate: body.startDate,
      endDate: body.endDate,
    };
  }
}
