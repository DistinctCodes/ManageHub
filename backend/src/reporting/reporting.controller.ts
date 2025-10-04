import { Controller, Get, Query, Res, UsePipes, ValidationPipe, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { ReportQueryDto } from './dto/report-query.dto';
import { jsonToCsvStream } from './utils/csv.helper';
import { recordsToPdfStream } from './utils/pdf.helper';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // GET /reports/assets?startDate=...&endDate=...&categoryId=...&departmentId=...&format=csv|pdf
  @Get('assets')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async assets(@Query() q: ReportQueryDto, @Res() res: Response) {
    const { format = 'csv', startDate, endDate, categoryId, departmentId } = q;
    const data = await this.reportsService.getAssetsReport({ startDate, endDate, categoryId, departmentId });
    const filename = `assets-report-${Date.now()}.${format}`;

    if (format === 'csv') {
      const fields = ['id','name','serialNumber','model','category','department','createdAt','metadata'];
      const stream = jsonToCsvStream(data, fields);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      stream.pipe(res);
    } else if (format === 'pdf') {
      const columns = ['id','name','serialNumber','model','category','department','createdAt'];
      const stream = recordsToPdfStream('Assets Report', columns, data);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      stream.pipe(res);
    } else {
      throw new BadRequestException('Unsupported format');
    }
  }

  // GET /reports/inventory
  @Get('inventory')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async inventory(@Query() q: ReportQueryDto, @Res() res: Response) {
    const { format = 'csv', startDate, endDate, categoryId, departmentId } = q;
    const data = await this.reportsService.getInventoryReport({ startDate, endDate, categoryId, departmentId });
    const filename = `inventory-report-${Date.now()}.${format}`;

    if (format === 'csv') {
      const fields = ['id','name','quantity','category','department','createdAt','metadata'];
      const stream = jsonToCsvStream(data, fields);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      stream.pipe(res);
    } else if (format === 'pdf') {
      const columns = ['id','name','quantity','category','department','createdAt'];
      const stream = recordsToPdfStream('Inventory Report', columns, data);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      stream.pipe(res);
    } else {
      throw new BadRequestException('Unsupported format');
    }
  }

  // GET /reports/usage
  @Get('usage')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async usage(@Query() q: ReportQueryDto, @Res() res: Response) {
    const { format = 'csv', startDate, endDate, categoryId, departmentId } = q;
    const data = await this.reportsService.getUsageReport({ startDate, endDate, categoryId, departmentId });
    const filename = `usage-report-${Date.now()}.${format}`;

    if (format === 'csv') {
      const fields = ['id','action','assetId','assetName','inventoryItemId','inventoryItemName','department','performedBy','performedAt','meta'];
      const stream = jsonToCsvStream(data, fields);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      stream.pipe(res);
    } else if (format === 'pdf') {
      const columns = ['performedAt','action','assetName','inventoryItemName','department','performedBy'];
      const stream = recordsToPdfStream('Usage History Report', columns, data);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      stream.pipe(res);
    } else {
      throw new BadRequestException('Unsupported format');
    }
  }
}
