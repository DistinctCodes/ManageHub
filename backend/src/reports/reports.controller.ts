import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guard/jwt.auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from '../users/enums/userRoles.enum';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('bookings')
  async bookings(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('format') format: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.service.bookingsReport(from, to);
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=bookings.csv');
      return this.service.toCsv(data);
    }
    return { data };
  }

  @Get('revenue')
  async revenue(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('format') format: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.service.revenueReport(from, to);
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=revenue.csv');
      return this.service.toCsv(result.invoices);
    }
    return { data: result };
  }

  @Get('members')
  async members(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('format') format: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.service.membersReport(from, to);
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=members.csv');
      return this.service.toCsv(result.members);
    }
    return { data: result };
  }

  @Get('occupancy')
  async occupancy(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('format') format: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const data = await this.service.occupancyReport(from, to);
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=occupancy.csv');
      return this.service.toCsv(data);
    }
    return { data };
  }
}
