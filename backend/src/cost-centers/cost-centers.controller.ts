import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ParseBoolPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { CostCentersService } from './cost-centers.service';
import { CreateCostCenterDto } from './dto/create-cost-center.dto';
import { UpdateCostCenterDto } from './dto/update-cost-center.dto';
import { CostCenterResponseDto } from './dto/cost-center-response.dto';

@ApiTags('Cost Centers')
@Controller('cost-centers')
export class CostCentersController {
  constructor(private readonly costCentersService: CostCentersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new cost center' })
  @ApiResponse({
    status: 201,
    description: 'Cost center created successfully',
    type: CostCenterResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Cost center name already exists' })
  async create(@Body() createDto: CreateCostCenterDto) {
    return await this.costCentersService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all cost centers' })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'Include inactive cost centers',
  })
  @ApiResponse({
    status: 200,
    description: 'List of cost centers',
    type: [CostCenterResponseDto],
  })
  async findAll(
    @Query('includeInactive', new ParseBoolPipe({ optional: true }))
    includeInactive?: boolean,
  ) {
    return await this.costCentersService.findAll(includeInactive);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a cost center by ID' })
  @ApiParam({ name: 'id', description: 'Cost center UUID' })
  @ApiResponse({
    status: 200,
    description: 'Cost center details',
    type: CostCenterResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Cost center not found' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return await this.costCentersService.findOne(id);
  }

  @Get(':id/financial-report')
  @ApiOperation({ summary: 'Get financial report for a cost center' })
  @ApiParam({ name: 'id', description: 'Cost center UUID' })
  @ApiResponse({
    status: 200,
    description: 'Financial report with assets and expenses',
  })
  @ApiResponse({ status: 404, description: 'Cost center not found' })
  async getFinancialReport(@Param('id', ParseUUIDPipe) id: string) {
    return await this.costCentersService.getFinancialReport(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a cost center' })
  @ApiParam({ name: 'id', description: 'Cost center UUID' })
  @ApiResponse({
    status: 200,
    description: 'Cost center updated successfully',
    type: CostCenterResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Cost center not found' })
  @ApiResponse({ status: 409, description: 'Cost center name already exists' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateCostCenterDto,
  ) {
    return await this.costCentersService.update(id, updateDto);
  }

  @Patch(':id/deactivate')
  @ApiOperation({ summary: 'Deactivate a cost center (soft delete)' })
  @ApiParam({ name: 'id', description: 'Cost center UUID' })
  @ApiResponse({
    status: 200,
    description: 'Cost center deactivated',
    type: CostCenterResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Cost center not found' })
  async softDelete(@Param('id', ParseUUIDPipe) id: string) {
    return await this.costCentersService.softDelete(id);
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore a deactivated cost center' })
  @ApiParam({ name: 'id', description: 'Cost center UUID' })
  @ApiResponse({
    status: 200,
    description: 'Cost center restored',
    type: CostCenterResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Cost center not found' })
  async restore(@Param('id', ParseUUIDPipe) id: string) {
    return await this.costCentersService.restore(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete a cost center' })
  @ApiParam({ name: 'id', description: 'Cost center UUID' })
  @ApiResponse({ status: 204, description: 'Cost center deleted' })
  @ApiResponse({ status: 404, description: 'Cost center not found' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.costCentersService.remove(id);
  }
}