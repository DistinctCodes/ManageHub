import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Patch,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ApiEndpointService } from './services/api-endpoint.service';
import { ApiMonitorService } from './services/api-monitor.service';
import { ApiAnalyticsService } from './services/api-analytics.service';
import { 
  CreateApiEndpointDto, 
  UpdateApiEndpointDto, 
  ApiEndpointQueryDto, 
  BulkUpdateEndpointsDto 
} from './dto/api-endpoint.dto';
import {
  PingResultQueryDto,
  ManualPingDto,
  BulkPingDto,
  PingResultAnalyticsDto,
  ExportPingResultsDto,
} from './dto/ping-result.dto';
import { ApiEndpoint, EndpointStatus } from './entities/api-endpoint.entity';
import { PingResult } from './entities/ping-result.entity';

@ApiTags('API Ping Monitor')
@Controller('api-ping-monitor')
// @UseGuards(JwtAuthGuard) // Uncomment when auth is implemented
// @ApiBearerAuth()
export class ApiPingMonitorController {
  private readonly logger = new Logger(ApiPingMonitorController.name);

  constructor(
    private readonly endpointService: ApiEndpointService,
    private readonly monitorService: ApiMonitorService,
    private readonly analyticsService: ApiAnalyticsService,
  ) {}

  // Endpoint Management
  @Post('endpoints')
  @ApiOperation({ summary: 'Create a new API endpoint for monitoring' })
  @ApiResponse({ status: 201, description: 'Endpoint created successfully', type: ApiEndpoint })
  @ApiResponse({ status: 400, description: 'Invalid input or endpoint already exists' })
  async createEndpoint(
    @Body(ValidationPipe) createEndpointDto: CreateApiEndpointDto,
  ): Promise<ApiEndpoint> {
    this.logger.log(`Creating new endpoint: ${createEndpointDto.name}`);
    return this.endpointService.create(createEndpointDto);
  }

  @Get('endpoints')
  @ApiOperation({ summary: 'Get all API endpoints with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Endpoints retrieved successfully' })
  async getEndpoints(
    @Query(ValidationPipe) queryDto: ApiEndpointQueryDto,
  ) {
    return this.endpointService.findAll(queryDto);
  }

  @Get('endpoints/:id')
  @ApiOperation({ summary: 'Get a specific API endpoint by ID' })
  @ApiResponse({ status: 200, description: 'Endpoint retrieved successfully', type: ApiEndpoint })
  @ApiResponse({ status: 404, description: 'Endpoint not found' })
  async getEndpoint(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApiEndpoint> {
    return this.endpointService.findOne(id);
  }

  @Put('endpoints/:id')
  @ApiOperation({ summary: 'Update an API endpoint' })
  @ApiResponse({ status: 200, description: 'Endpoint updated successfully', type: ApiEndpoint })
  @ApiResponse({ status: 404, description: 'Endpoint not found' })
  async updateEndpoint(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateEndpointDto: UpdateApiEndpointDto,
  ): Promise<ApiEndpoint> {
    this.logger.log(`Updating endpoint: ${id}`);
    return this.endpointService.update(id, updateEndpointDto);
  }

  @Delete('endpoints/:id')
  @ApiOperation({ summary: 'Delete an API endpoint' })
  @ApiResponse({ status: 204, description: 'Endpoint deleted successfully' })
  @ApiResponse({ status: 404, description: 'Endpoint not found' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEndpoint(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    this.logger.log(`Deleting endpoint: ${id}`);
    return this.endpointService.remove(id);
  }

  @Patch('endpoints/bulk-update')
  @ApiOperation({ summary: 'Update multiple endpoints at once' })
  @ApiResponse({ status: 200, description: 'Bulk update completed' })
  async bulkUpdateEndpoints(
    @Body(ValidationPipe) bulkUpdateDto: BulkUpdateEndpointsDto,
  ) {
    this.logger.log(`Bulk updating ${bulkUpdateDto.endpointIds.length} endpoints`);
    return this.endpointService.bulkUpdate(bulkUpdateDto);
  }

  @Patch('endpoints/:id/status')
  @ApiOperation({ summary: 'Toggle endpoint status (active/inactive/paused)' })
  @ApiResponse({ status: 200, description: 'Status updated successfully', type: ApiEndpoint })
  async toggleEndpointStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { status: EndpointStatus },
  ): Promise<ApiEndpoint> {
    this.logger.log(`Changing status of endpoint ${id} to ${body.status}`);
    return this.endpointService.toggleStatus(id, body.status);
  }

  @Patch('endpoints/:id/active')
  @ApiOperation({ summary: 'Enable or disable endpoint monitoring' })
  @ApiResponse({ status: 200, description: 'Active status updated successfully', type: ApiEndpoint })
  async toggleEndpointActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { isActive: boolean },
  ): Promise<ApiEndpoint> {
    this.logger.log(`${body.isActive ? 'Activating' : 'Deactivating'} endpoint ${id}`);
    return this.endpointService.toggleActive(id, body.isActive);
  }

  // Provider-specific endpoints
  @Get('endpoints/provider/:provider')
  @ApiOperation({ summary: 'Get all endpoints for a specific provider' })
  @ApiResponse({ status: 200, description: 'Provider endpoints retrieved successfully' })
  async getEndpointsByProvider(
    @Param('provider') provider: string,
  ): Promise<ApiEndpoint[]> {
    return this.endpointService.getEndpointsByProvider(provider);
  }

  @Post('endpoints/presets/:provider')
  @ApiOperation({ summary: 'Create preset endpoints for a provider (Stripe, Google, etc.)' })
  @ApiResponse({ status: 201, description: 'Preset endpoints created successfully' })
  async createPresetEndpoints(
    @Param('provider') provider: string,
    @Body() body: { createdBy: string },
  ): Promise<ApiEndpoint[]> {
    this.logger.log(`Creating preset endpoints for provider: ${provider}`);
    return this.endpointService.createPresetEndpoints(provider, body.createdBy);
  }

  // Manual Ping Operations
  @Post('ping/manual/:endpointId')
  @ApiOperation({ summary: 'Manually ping a specific endpoint' })
  @ApiResponse({ status: 200, description: 'Manual ping completed successfully' })
  async manualPing(
    @Param('endpointId', ParseUUIDPipe) endpointId: string,
    @Body(ValidationPipe) manualPingDto: ManualPingDto,
  ) {
    this.logger.log(`Manual ping requested for endpoint: ${endpointId}`);
    return this.monitorService.pingSpecificEndpoint(endpointId);
  }

  @Post('ping/bulk')
  @ApiOperation({ summary: 'Manually ping multiple endpoints' })
  @ApiResponse({ status: 200, description: 'Bulk ping completed successfully' })
  async bulkPing(
    @Body(ValidationPipe) bulkPingDto: BulkPingDto,
  ) {
    this.logger.log(`Bulk ping requested for ${bulkPingDto.endpointIds.length} endpoints`);
    return this.monitorService.bulkPing(bulkPingDto.endpointIds);
  }

  @Post('ping/all-active')
  @ApiOperation({ summary: 'Manually ping all active endpoints' })
  @ApiResponse({ status: 200, description: 'All active endpoints pinged successfully' })
  async pingAllActive(
    @Body() body: { triggeredBy: string },
  ) {
    this.logger.log('Manual ping requested for all active endpoints');
    return this.monitorService.pingAllActiveEndpoints(body.triggeredBy);
  }

  // Ping Results and History
  @Get('results')
  @ApiOperation({ summary: 'Get ping results with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Ping results retrieved successfully' })
  async getPingResults(
    @Query(ValidationPipe) queryDto: PingResultQueryDto,
  ) {
    return this.monitorService.getPingResults(queryDto);
  }

  @Get('results/:id')
  @ApiOperation({ summary: 'Get a specific ping result by ID' })
  @ApiResponse({ status: 200, description: 'Ping result retrieved successfully', type: PingResult })
  @ApiResponse({ status: 404, description: 'Ping result not found' })
  async getPingResult(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PingResult> {
    return this.monitorService.getPingResult(id);
  }

  @Get('endpoints/:endpointId/results')
  @ApiOperation({ summary: 'Get ping results for a specific endpoint' })
  @ApiResponse({ status: 200, description: 'Endpoint ping results retrieved successfully' })
  async getEndpointPingResults(
    @Param('endpointId', ParseUUIDPipe) endpointId: string,
    @Query(ValidationPipe) queryDto: PingResultQueryDto,
  ) {
    return this.monitorService.getEndpointPingResults(endpointId, queryDto);
  }

  @Get('endpoints/:endpointId/history')
  @ApiOperation({ summary: 'Get historical data for an endpoint' })
  @ApiResponse({ status: 200, description: 'Endpoint history retrieved successfully' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days to include (default: 7)' })
  async getEndpointHistory(
    @Param('endpointId', ParseUUIDPipe) endpointId: string,
    @Query('days') days?: number,
  ) {
    return this.endpointService.getEndpointHistory(endpointId, days || 7);
  }

  // Statistics and Analytics
  @Get('statistics')
  @ApiOperation({ summary: 'Get overall monitoring statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStatistics() {
    return this.endpointService.getEndpointStatistics();
  }

  @Get('analytics/uptime')
  @ApiOperation({ summary: 'Get detailed uptime analytics' })
  @ApiResponse({ status: 200, description: 'Uptime analytics retrieved successfully' })
  @ApiQuery({ name: 'period', required: false, enum: ['1h', '24h', '7d', '30d'], description: 'Analysis period' })
  @ApiQuery({ name: 'endpointId', required: false, type: String, description: 'Specific endpoint ID' })
  async getUptimeAnalytics(
    @Query('period') period: '1h' | '24h' | '7d' | '30d' = '24h',
    @Query('endpointId') endpointId?: string,
  ) {
    return this.analyticsService.getUptimeMetrics(endpointId, period);
  }

  @Get('analytics/performance')
  @ApiOperation({ summary: 'Get detailed performance analytics' })
  @ApiResponse({ status: 200, description: 'Performance analytics retrieved successfully' })
  @ApiQuery({ name: 'period', required: false, enum: ['1h', '24h', '7d', '30d'], description: 'Analysis period' })
  @ApiQuery({ name: 'endpointId', required: false, type: String, description: 'Specific endpoint ID' })
  async getPerformanceAnalytics(
    @Query('period') period: '1h' | '24h' | '7d' | '30d' = '24h',
    @Query('endpointId') endpointId?: string,
  ) {
    return this.analyticsService.getPerformanceMetrics(endpointId, period);
  }

  @Get('analytics/incidents')
  @ApiOperation({ summary: 'Get detailed incident analytics' })
  @ApiResponse({ status: 200, description: 'Incident analytics retrieved successfully' })
  @ApiQuery({ name: 'period', required: false, enum: ['1h', '24h', '7d', '30d'], description: 'Analysis period' })
  @ApiQuery({ name: 'endpointId', required: false, type: String, description: 'Specific endpoint ID' })
  async getIncidentAnalytics(
    @Query('period') period: '1h' | '24h' | '7d' | '30d' = '24h',
    @Query('endpointId') endpointId?: string,
  ) {
    return this.analyticsService.getIncidentMetrics(endpointId, period);
  }

  @Get('analytics/comparison/:endpointId')
  @ApiOperation({ summary: 'Get comparison analytics between two periods' })
  @ApiResponse({ status: 200, description: 'Comparison analytics retrieved successfully' })
  @ApiQuery({ name: 'current', required: false, enum: ['1h', '24h', '7d', '30d'], description: 'Current period' })
  @ApiQuery({ name: 'previous', required: false, enum: ['1h', '24h', '7d', '30d'], description: 'Previous period' })
  async getComparisonAnalytics(
    @Param('endpointId', ParseUUIDPipe) endpointId: string,
    @Query('current') current: '1h' | '24h' | '7d' | '30d' = '24h',
    @Query('previous') previous: '1h' | '24h' | '7d' | '30d' = '24h',
  ) {
    return this.analyticsService.getComparisonMetrics(endpointId, current, previous);
  }

  @Get('analytics/global')
  @ApiOperation({ summary: 'Get global system analytics and trends' })
  @ApiResponse({ status: 200, description: 'Global analytics retrieved successfully' })
  @ApiQuery({ name: 'period', required: false, enum: ['1h', '24h', '7d', '30d'], description: 'Analysis period' })
  async getGlobalAnalytics(
    @Query('period') period: '1h' | '24h' | '7d' | '30d' = '24h',
  ) {
    return this.analyticsService.getGlobalMetrics(period);
  }

  @Get('analytics/sla')
  @ApiOperation({ summary: 'Generate SLA compliance report' })
  @ApiResponse({ status: 200, description: 'SLA report generated successfully' })
  @ApiQuery({ name: 'endpointId', required: false, type: String, description: 'Specific endpoint ID' })
  @ApiQuery({ name: 'target', required: false, type: Number, description: 'SLA target percentage (default: 99.9)' })
  @ApiQuery({ name: 'period', required: false, enum: ['30d', '90d'], description: 'Report period' })
  async getSLAReport(
    @Query('endpointId') endpointId?: string,
    @Query('target') target: number = 99.9,
    @Query('period') period: '30d' | '90d' = '30d',
  ) {
    return this.analyticsService.generateSLAReport(endpointId, target, period);
  }

  @Post('analytics/custom')
  @ApiOperation({ summary: 'Generate custom analytics report' })
  @ApiResponse({ status: 200, description: 'Custom report generated successfully' })
  async getCustomAnalytics(
    @Body() options: {
      endpointIds?: string[];
      providers?: string[];
      startDate: string;
      endDate: string;
      includeMetrics: ('uptime' | 'performance' | 'incidents')[];
      groupBy: 'endpoint' | 'provider' | 'day' | 'hour';
    },
  ) {
    return this.analyticsService.generateCustomReport({
      ...options,
      startDate: new Date(options.startDate),
      endDate: new Date(options.endDate),
    });
  }

  @Get('health-overview')
  @ApiOperation({ summary: 'Get overall system health overview' })
  @ApiResponse({ status: 200, description: 'Health overview retrieved successfully' })
  async getHealthOverview() {
    const [total, active, healthy, unhealthy] = await Promise.all([
      this.endpointService.getEndpointStatistics(),
      this.endpointService.getActiveEndpoints(),
      this.endpointService.getHealthyEndpoints(),
      this.endpointService.getUnhealthyEndpoints(),
    ]);

    return {
      overview: total,
      activeEndpoints: active.length,
      healthyEndpoints: healthy.length,
      unhealthyEndpoints: unhealthy.length,
      criticalEndpoints: unhealthy.filter(e => e.currentStatus === 'down').length,
      degradedEndpoints: unhealthy.filter(e => e.currentStatus === 'degraded').length,
    };
  }

  // Monitoring Status and Control
  @Get('monitor/status')
  @ApiOperation({ summary: 'Get monitoring service status' })
  @ApiResponse({ status: 200, description: 'Monitor status retrieved successfully' })
  async getMonitorStatus() {
    return this.monitorService.getMonitoringStatus();
  }

  @Post('monitor/start')
  @ApiOperation({ summary: 'Start the monitoring service' })
  @ApiResponse({ status: 200, description: 'Monitoring service started successfully' })
  async startMonitoring() {
    this.logger.log('Starting monitoring service');
    return this.monitorService.startMonitoring();
  }

  @Post('monitor/stop')
  @ApiOperation({ summary: 'Stop the monitoring service' })
  @ApiResponse({ status: 200, description: 'Monitoring service stopped successfully' })
  async stopMonitoring() {
    this.logger.log('Stopping monitoring service');
    return this.monitorService.stopMonitoring();
  }

  @Post('monitor/restart')
  @ApiOperation({ summary: 'Restart the monitoring service' })
  @ApiResponse({ status: 200, description: 'Monitoring service restarted successfully' })
  async restartMonitoring() {
    this.logger.log('Restarting monitoring service');
    return this.monitorService.restartMonitoring();
  }

  // Export and Reporting
  @Post('export/results')
  @ApiOperation({ summary: 'Export ping results to various formats' })
  @ApiResponse({ status: 200, description: 'Results exported successfully' })
  async exportResults(
    @Body(ValidationPipe) exportDto: ExportPingResultsDto,
  ) {
    this.logger.log(`Exporting ping results in ${exportDto.format} format`);
    return this.monitorService.exportPingResults(exportDto);
  }

  @Get('reports/uptime')
  @ApiOperation({ summary: 'Generate uptime report for all endpoints' })
  @ApiResponse({ status: 200, description: 'Uptime report generated successfully' })
  @ApiQuery({ name: 'period', required: false, enum: ['24h', '7d', '30d'], description: 'Report period' })
  async getUptimeReport(
    @Query('period') period: '24h' | '7d' | '30d' = '24h',
  ) {
    return this.monitorService.generateUptimeReport(period);
  }

  @Get('reports/performance')
  @ApiOperation({ summary: 'Generate performance report for all endpoints' })
  @ApiResponse({ status: 200, description: 'Performance report generated successfully' })
  @ApiQuery({ name: 'period', required: false, enum: ['24h', '7d', '30d'], description: 'Report period' })
  async getPerformanceReport(
    @Query('period') period: '24h' | '7d' | '30d' = '24h',
  ) {
    return this.monitorService.generatePerformanceReport(period);
  }

  @Get('reports/incidents')
  @ApiOperation({ summary: 'Generate incidents report' })
  @ApiResponse({ status: 200, description: 'Incidents report generated successfully' })
  @ApiQuery({ name: 'period', required: false, enum: ['24h', '7d', '30d'], description: 'Report period' })
  async getIncidentsReport(
    @Query('period') period: '24h' | '7d' | '30d' = '24h',
  ) {
    return this.monitorService.generateIncidentsReport(period);
  }

  // Health Check for the monitoring system itself
  @Get('health')
  @ApiOperation({ summary: 'Health check for the monitoring system' })
  @ApiResponse({ status: 200, description: 'System is healthy' })
  async healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      services: {
        monitoring: await this.monitorService.isHealthy(),
        database: true, // TODO: Add actual database health check
      },
    };
  }
}