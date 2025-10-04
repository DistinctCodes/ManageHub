import { Controller, Get, Post, Body, Query, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuditsService } from './audits.service';
import { CreateAuditDto } from './dto/create-audit.dto';
import { QueryAuditDto } from './dto/query-audit.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/userRoles.enum';

@ApiTags('audits')
@ApiBearerAuth()
@Controller('audits')
@UseGuards(RolesGuard)
export class AuditsController {
  constructor(private readonly auditsService: AuditsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create audit log manually (Admin only)' })
  @ApiResponse({ status: 201, description: 'Audit log created successfully' })
  async create(@Body() createAuditDto: CreateAuditDto) {
    const audit = await this.auditsService.create(createAuditDto);
    return {
      success: true,
      message: 'Audit log created successfully',
      data: audit,
    };
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get all audit logs with filters (Admin only)' })
  @ApiResponse({ status: 200, description: 'Audit logs retrieved successfully' })
  async findAll(@Query() query: QueryAuditDto) {
    const result = await this.auditsService.findAll(query);
    return {
      success: true,
      data: result.data,
      total: result.total,
      page: result.page,
      limit: result.limit,
    };
  }

  @Get('user/:userId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get audit logs for specific user (Admin only)' })
  @ApiResponse({ status: 200, description: 'User audit logs retrieved successfully' })
  async findByUser(@Param('userId', ParseUUIDPipe) userId: string) {
    const audits = await this.auditsService.findByUser(userId);
    return {
      success: true,
      data: audits,
    };
  }

  @Get('entity/:entityType/:entityId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get audit logs for specific entity (Admin only)' })
  @ApiResponse({ status: 200, description: 'Entity audit logs retrieved successfully' })
  async findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    const audits = await this.auditsService.findByEntity(entityType, entityId);
    return {
      success: true,
      data: audits,
    };
  }

  @Get('stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get audit statistics (Admin only)' })
  @ApiResponse({ status: 200, description: 'Audit statistics retrieved successfully' })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getStats(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const stats = await this.auditsService.getStats(
      startDate ? new Date(startDate) : undefined,
      endDate ? new Date(endDate) : undefined,
    );
    return {
      success: true,
      data: stats,
    };
  }
}