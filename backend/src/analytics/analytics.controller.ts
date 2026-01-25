import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Res,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { AnalyticsService } from './analytics.service';
import {
  AnalyticsQueryDto,
  DashboardQueryDto,
} from './dto/analytics-query.dto';
import { ExportReportDto } from './dto/export-report.dto';
import { CsvExporterService } from './exporters/csv-exporter.service';
import { ExcelExporterService } from './exporters/excel-exporter.service';
import { PdfExporterService } from './exporters/pdf-exporter.service';
import { GetCurrentUser } from '../auth/decorators/getCurrentUser.decorator';
import { User } from '../users/entities/user.entity';

@ApiTags('Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/analytics')
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly csvExporter: CsvExporterService,
    private readonly excelExporter: ExcelExporterService,
    private readonly pdfExporter: PdfExporterService,
  ) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard overview statistics' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics retrieved successfully',
  })
  async getDashboard(
    @Query() query: DashboardQueryDto,
    @GetCurrentUser() user: User,
  ) {
    return this.analyticsService.getDashboardStats(query, user.role);
  }

  @Get('attendance')
  @ApiOperation({ summary: 'Get attendance analytics' })
  @ApiResponse({
    status: 200,
    description: 'Attendance analytics retrieved successfully',
  })
  @ApiQuery({ name: 'startDate', required: true, example: '2026-01-01' })
  @ApiQuery({ name: 'endDate', required: true, example: '2026-01-31' })
  @ApiQuery({
    name: 'aggregation',
    required: false,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
  })
  async getAttendance(
    @Query() query: AnalyticsQueryDto,
    @GetCurrentUser() user: User,
  ) {
    return this.analyticsService.getAttendanceAnalytics(query, user.role);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue analytics' })
  @ApiResponse({
    status: 200,
    description: 'Revenue analytics retrieved successfully',
  })
  @ApiQuery({ name: 'startDate', required: true, example: '2026-01-01' })
  @ApiQuery({ name: 'endDate', required: true, example: '2026-01-31' })
  @ApiQuery({
    name: 'aggregation',
    required: false,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
  })
  async getRevenue(
    @Query() query: AnalyticsQueryDto,
    @GetCurrentUser() user: User,
  ) {
    return this.analyticsService.getRevenueAnalytics(query, user.role);
  }

  @Get('members')
  @ApiOperation({ summary: 'Get member analytics' })
  @ApiResponse({
    status: 200,
    description: 'Member analytics retrieved successfully',
  })
  @ApiQuery({ name: 'startDate', required: true, example: '2026-01-01' })
  @ApiQuery({ name: 'endDate', required: true, example: '2026-01-31' })
  @ApiQuery({
    name: 'aggregation',
    required: false,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
  })
  async getMembers(
    @Query() query: AnalyticsQueryDto,
    @GetCurrentUser() user: User,
  ) {
    return this.analyticsService.getMemberAnalytics(query, user.role);
  }

  @Get('occupancy')
  @ApiOperation({ summary: 'Get occupancy/workspace utilization analytics' })
  @ApiResponse({
    status: 200,
    description: 'Occupancy analytics retrieved successfully',
  })
  @ApiQuery({ name: 'startDate', required: true, example: '2026-01-01' })
  @ApiQuery({ name: 'endDate', required: true, example: '2026-01-31' })
  @ApiQuery({
    name: 'aggregation',
    required: false,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
  })
  async getOccupancy(
    @Query() query: AnalyticsQueryDto,
    @GetCurrentUser() user: User,
  ) {
    return this.analyticsService.getOccupancyAnalytics(query, user.role);
  }

  @Post('export')
  @ApiOperation({ summary: 'Export analytics report (CSV, Excel, or PDF)' })
  @ApiResponse({ status: 200, description: 'Report exported successfully' })
  async exportReport(
    @Body() exportDto: ExportReportDto,
    @GetCurrentUser() user: User,
    @Res() res: Response,
  ) {
    const query: AnalyticsQueryDto = {
      startDate: exportDto.startDate,
      endDate: exportDto.endDate,
      aggregation: 'daily',
    };

    let data: any[];
    let buffer: Buffer;
    let contentType: string;
    let fileExtension: string;

    // Get the appropriate data based on report type
    switch (exportDto.reportType) {
      case 'dashboard':
        const dashboard = await this.analyticsService.getDashboardStats(
          {},
          user.role,
        );
        data = [dashboard.data];
        break;
      case 'attendance':
        const attendance = await this.analyticsService.getAttendanceAnalytics(
          query,
          user.role,
        );
        data = attendance.data.trends;
        break;
      case 'revenue':
        const revenue = await this.analyticsService.getRevenueAnalytics(
          query,
          user.role,
        );
        data = revenue.data.trends;
        break;
      case 'members':
        const members = await this.analyticsService.getMemberAnalytics(
          query,
          user.role,
        );
        data = members.data.memberGrowth;
        break;
      case 'occupancy':
        const occupancy = await this.analyticsService.getOccupancyAnalytics(
          query,
          user.role,
        );
        data = occupancy.data.trends;
        break;
      default:
        data = [];
    }

    // Export based on format
    switch (exportDto.format) {
      case 'csv':
        buffer = await this.csvExporter.exportToCsv(
          data,
          exportDto.columns,
          exportDto.title,
        );
        contentType = this.csvExporter.getContentType();
        fileExtension = this.csvExporter.getFileExtension();
        break;
      case 'excel':
        buffer = await this.excelExporter.exportToExcel(
          data,
          exportDto.reportType,
          exportDto.title,
        );
        contentType = this.excelExporter.getContentType();
        fileExtension = this.excelExporter.getFileExtension();
        break;
      case 'pdf':
        if (exportDto.reportType === 'dashboard' && data.length > 0) {
          buffer = await this.pdfExporter.exportDashboardReport(
            data[0],
            exportDto.title,
          );
        } else {
          buffer = await this.pdfExporter.exportToPdf(
            data,
            exportDto.title || `${exportDto.reportType} Report`,
            exportDto.includeCharts,
          );
        }
        contentType = this.pdfExporter.getContentType();
        fileExtension = this.pdfExporter.getFileExtension();
        break;
      default:
        return res.status(HttpStatus.BAD_REQUEST).json({
          message: 'Unsupported export format',
        });
    }

    const fileName = `${exportDto.reportType}_report_${new Date().toISOString().split('T')[0]}.${fileExtension}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', buffer.length);

    return res.send(buffer);
  }
}
