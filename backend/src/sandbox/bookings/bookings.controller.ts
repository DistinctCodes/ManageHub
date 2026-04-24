import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorators';
import { UserRole } from '../../users/enums/userRoles.enum';
import { BulkCancelProvider } from './providers/bulk-cancel.provider';
import { BulkCancelDto } from './dto/bulk-cancel.dto';

@ApiTags('sandbox/bookings')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('sandbox/bookings')
export class SandboxBookingsController {
  constructor(private readonly bulkCancelProvider: BulkCancelProvider) {}

  @Post('bulk-cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bulk cancel bookings (Admin)' })
  async bulkCancel(@Body() dto: BulkCancelDto) {
    const result = await this.bulkCancelProvider.bulkCancel(dto.bookingIds);
    return { message: 'Bulk cancellation completed', data: result };
  }
}
