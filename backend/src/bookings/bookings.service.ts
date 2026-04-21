import { Injectable } from '@nestjs/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingQueryDto } from './dto/booking-query.dto';
import { CreateBookingProvider } from './providers/create-booking.provider';
import { ConfirmBookingProvider } from './providers/confirm-booking.provider';
import { CancelBookingProvider } from './providers/cancel-booking.provider';
import { CompleteBookingProvider } from './providers/complete-booking.provider';
import { FindBookingsProvider } from './providers/find-bookings.provider';
import { UserRole } from '../users/enums/userRoles.enum';
import { Booking } from './entities/booking.entity';
import { PricingService } from './pricing/pricing.service';
import { PlanType } from './enums/plan-type.enum';

@Injectable()
export class BookingsService {
  constructor(
    private readonly createBookingProvider: CreateBookingProvider,
    private readonly confirmBookingProvider: ConfirmBookingProvider,
    private readonly cancelBookingProvider: CancelBookingProvider,
    private readonly completeBookingProvider: CompleteBookingProvider,
    private readonly findBookingsProvider: FindBookingsProvider,
    private readonly pricingService: PricingService,
  ) {}

  create(dto: CreateBookingDto, userId: string) {
    return this.createBookingProvider.create(dto, userId);
  }

  confirm(bookingId: string): Promise<Booking> {
    return this.confirmBookingProvider.confirm(bookingId);
  }

  cancel(bookingId: string, userId: string, userRole: UserRole) {
    return this.cancelBookingProvider.cancel(bookingId, userId, userRole);
  }

  complete(bookingId: string) {
    return this.completeBookingProvider.complete(bookingId);
  }

  findAll(query: BookingQueryDto, userId: string, userRole: UserRole) {
    return this.findBookingsProvider.findAll(query, userId, userRole);
  }

  findById(bookingId: string, userId: string, userRole: UserRole) {
    return this.findBookingsProvider.findById(bookingId, userId, userRole);
  }

  calculatePrice(
    hourlyRateKobo: number,
    planType: PlanType,
    seatCount: number,
    startDate: string,
    endDate: string,
  ) {
    return this.pricingService.calculateAmount(
      hourlyRateKobo,
      planType,
      seatCount,
      startDate,
      endDate,
    );
  }

  getPlanSummary(planType: PlanType) {
    return this.pricingService.getPlanSummary(planType);
  }
}
