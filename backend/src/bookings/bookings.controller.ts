import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingQueryDto } from './dto/booking-query.dto';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from '../users/enums/userRoles.enum';
import { GetCurrentUser } from '../auth/decorators/getCurrentUser.decorator';
import { PlanType } from './enums/plan-type.enum';

@ApiTags('bookings')
@ApiBearerAuth()
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a booking' })
  async create(
    @Body() dto: CreateBookingDto,
    @GetCurrentUser('id') userId: string,
  ) {
    const booking = await this.bookingsService.create(dto, userId);
    return { message: 'Booking created successfully', data: booking };
  }

  @Get()
  @ApiOperation({
    summary: 'List bookings (own for users, all for admin/staff)',
  })
  async findAll(
    @Query() query: BookingQueryDto,
    @GetCurrentUser('id') userId: string,
    @GetCurrentUser('role') userRole: UserRole,
  ) {
    const result = await this.bookingsService.findAll(query, userId, userRole);
    return { message: 'Bookings retrieved successfully', ...result };
  }

  @Get('price-estimate')
  @ApiOperation({ summary: 'Get a price estimate for a booking plan' })
  @ApiQuery({ name: 'workspaceId', required: true })
  @ApiQuery({ name: 'planType', enum: PlanType, required: true })
  @ApiQuery({ name: 'seatCount', required: false })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  async getPriceEstimate(
    @Query('hourlyRate') hourlyRate: string,
    @Query('planType') planType: PlanType,
    @Query('seatCount') seatCount: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const amount = this.bookingsService.calculatePrice(
      Number(hourlyRate),
      planType,
      seatCount ? Number(seatCount) : 1,
      startDate,
      endDate,
    );
    const summary = this.bookingsService.getPlanSummary(planType);
    return {
      message: 'Price estimate calculated',
      data: { amountKobo: amount, amountNaira: amount / 100, ...summary },
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking by ID' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @GetCurrentUser('id') userId: string,
    @GetCurrentUser('role') userRole: UserRole,
  ) {
    const booking = await this.bookingsService.findById(id, userId, userRole);
    return { message: 'Booking retrieved successfully', data: booking };
  }

  @Patch(':id/confirm')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm a booking (Admin/Staff)' })
  async confirm(@Param('id', ParseUUIDPipe) id: string) {
    const booking = await this.bookingsService.confirm(id);
    return { message: 'Booking confirmed successfully', data: booking };
  }

  @Patch(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a booking' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @GetCurrentUser('id') userId: string,
    @GetCurrentUser('role') userRole: UserRole,
  ) {
    const booking = await this.bookingsService.cancel(id, userId, userRole);
    return { message: 'Booking cancelled successfully', data: booking };
  }

  @Patch(':id/complete')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark booking as completed (Admin/Staff)' })
  async complete(@Param('id', ParseUUIDPipe) id: string) {
    const booking = await this.bookingsService.complete(id);
    return { message: 'Booking completed successfully', data: booking };
  }
}
