import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../entities/booking.entity';
import { BookingStatus } from '../enums/booking-status.enum';

@Injectable()
export class CompleteBookingProvider {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
  ) {}

  async complete(bookingId: string): Promise<Booking> {
    const booking = await this.bookingsRepository.findOne({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException(`Booking "${bookingId}" not found`);
    }
    if (booking.status !== BookingStatus.CONFIRMED) {
      throw new BadRequestException('Only CONFIRMED bookings can be completed');
    }

    booking.status = BookingStatus.COMPLETED;
    return this.bookingsRepository.save(booking);
  }
}
