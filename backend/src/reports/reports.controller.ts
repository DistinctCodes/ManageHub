import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import { ReportFormat } from './enums/report-format.enum';
// --- Assuming you have auth ---
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
// import { Roles } from '../auth/decorators/roles.decorator';
// import { Role } an../auth/enums/role.enum';
// import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('reports')
// @UseGuards(JwtAuthGuard, RolesGuard) // <-- Protect this endpoint
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  // @Roles(Role.ADMIN, Role.STAFF) // <-- Only staff/admins
  async generateReport(
    @Query() generateReportDto: GenerateReportDto,
    @Res() res: Response,
  ) {
    const report = await this.reportsService.generateReport(
      generateReportDto,
    );

    if (generateReportDto.format === ReportFormat.CSV) {
      res.header('Content-Type', 'text/csv');
      res.attachment(
        `report-${generateReportDto.reportType}-${new Date().toISOString().split('T')[0]}.csv`,
      );
      return res.send(report);
    }

    // Default: JSON
    return res.json(report);
  }
}