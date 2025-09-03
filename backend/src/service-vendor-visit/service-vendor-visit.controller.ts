  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: 'Scheduled' | 'Completed' | 'Cancelled') {
    return {
      status: 'success',
      message: 'Service vendor visit status updated successfully',
      data: await this.serviceVendorVisitService.update(id, { status }),
    };
  }

  @Patch(':id/restore')
  async restore(@Param('id') id: string) {
    return {
      status: 'success',
      message: 'Service vendor visit restored successfully',
      data: await this.serviceVendorVisitService.restore(id),
    };
  }
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ServiceVendorVisitService } from './service-vendor-visit.service';
import { 
  CreateServiceVendorVisitDto, 
  UpdateServiceVendorVisitDto, 
  ServiceVendorVisitQueryDto 
} from './dto/create-service-vendor-visit.dto';

@ApiTags('Service Vendor Visits')
@Controller('service-vendor-visits')
// @UseGuards(AuthGuard) // Uncomment if you have authentication
// @ApiBearerAuth() // Uncomment if you have authentication
export class ServiceVendorVisitController {
  constructor(private readonly serviceVendorVisitService: ServiceVendorVisitService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new service vendor visit record' })
  @ApiResponse({ status: 201, description: 'Visit record created successfully' })
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createDto: CreateServiceVendorVisitDto) {
    return {
      status: 'success',
      message: 'Service vendor visit recorded successfully',
      data: await this.serviceVendorVisitService.create(createDto),
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get all service vendor visits with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Visits retrieved successfully' })
  async findAll(@Query() queryDto: ServiceVendorVisitQueryDto) {
    const result = await this.serviceVendorVisitService.findAll(queryDto);
    return {
      status: 'success',
      message: 'Service vendor visits retrieved successfully',
      ...result,
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get visit statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats() {
    return {
      status: 'success',
      message: 'Statistics retrieved successfully',
      data: await this.serviceVendorVisitService.getVisitStats(),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific service vendor visit by ID' })
  @ApiResponse({ status: 200, description: 'Visit retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Visit not found' })
  async findOne(@Param('id') id: string) {
    return {
      status: 'success',
      message: 'Service vendor visit retrieved successfully',
      data: await this.serviceVendorVisitService.findOne(id),
    };
  }


  @Patch(':id')
  @ApiOperation({ summary: 'Update a service vendor visit record' })
  @ApiResponse({ status: 200, description: 'Visit updated successfully' })
  @ApiResponse({ status: 404, description: 'Visit not found' })
  async update(@Param('id') id: string, @Body() updateDto: UpdateServiceVendorVisitDto) {
    return {
      status: 'success',
      message: 'Service vendor visit updated successfully',
      data: await this.serviceVendorVisitService.update(id, updateDto),
    };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update the status of a service vendor visit' })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  @ApiResponse({ status: 404, description: 'Visit not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: 'Scheduled' | 'Completed' | 'Cancelled',
  ) {
    return {
      status: 'success',
      message: 'Service vendor visit status updated successfully',
      data: await this.serviceVendorVisitService.update(id, { status }),
    };
  }

  @Patch(':id/restore')
  @ApiOperation({ summary: 'Restore a soft-deleted service vendor visit' })
  @ApiResponse({ status: 200, description: 'Visit restored successfully' })
  @ApiResponse({ status: 404, description: 'Visit not found' })
  async restore(@Param('id') id: string) {
    return {
      status: 'success',
      message: 'Service vendor visit restored successfully',
      data: await this.serviceVendorVisitService.restore(id),
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a service vendor visit record' })
  @ApiResponse({ status: 200, description: 'Visit deleted successfully' })
  @ApiResponse({ status: 404, description: 'Visit not found' })
  async remove(@Param('id') id: string) {
    await this.serviceVendorVisitService.remove(id);
    return {
      status: 'success',
      message: 'Service vendor visit deleted successfully',
    };
  }
}