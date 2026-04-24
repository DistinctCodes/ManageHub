import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorators';
import { UserRole } from '../../users/enums/userRoles.enum';
import { BookingCsvProvider } from './providers/booking-csv.provider';
import { BookingReportQueryDto } from './dto/booking-report-query.dto';

@ApiTags('sandbox/reports')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('sandbox/reports')
export class ReportsController {
  constructor(private readonly bookingCsvProvider: BookingCsvProvider) {}

  @Get('bookings.csv')
  @ApiOperation({ summary: 'Export bookings as CSV (Admin)' })
  async exportBookingsCsv(
    @Query() query: BookingReportQueryDto,
    @Res() res: Response,
  ) {
    await this.bookingCsvProvider.streamCsv(query, res);
  }
}
