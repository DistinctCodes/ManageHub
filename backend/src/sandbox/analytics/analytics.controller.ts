import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorators';
import { UserRole } from '../../users/enums/userRoles.enum';
import { OccupancyRateProvider } from './providers/occupancy-rate.provider';
import { OccupancyRateQueryDto } from './dto/occupancy-query.dto';

@ApiTags('sandbox/analytics')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('sandbox/analytics')
export class AnalyticsController {
  constructor(private readonly occupancyRateProvider: OccupancyRateProvider) {}

  @Get('occupancy')
  @ApiOperation({ summary: 'Get workspace occupancy rate (Admin)' })
  async getOccupancyRate(@Query() query: OccupancyRateQueryDto) {
    const data = await this.occupancyRateProvider.getOccupancyRate(query);
    return { message: 'Occupancy rate retrieved successfully', data };
  }
}
