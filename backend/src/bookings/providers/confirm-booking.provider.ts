import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../entities/booking.entity';
import { BookingStatus } from '../enums/booking-status.enum';
import { User } from '../../users/entities/user.entity';
import { MembershipStatus } from '../../users/enums/membership-status.enum';

@Injectable()
export class ConfirmBookingProvider {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async confirm(bookingId: string): Promise<Booking> {
    const booking = await this.bookingsRepository.findOne({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException(`Booking "${bookingId}" not found`);
    }
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Only PENDING bookings can be confirmed');
    }

    booking.status = BookingStatus.CONFIRMED;
    await this.bookingsRepository.save(booking);

    // Activate member and set memberSince if first booking
    const user = await this.usersRepository.findOne({
      where: { id: booking.userId },
    });
    if (user && !user.memberSince) {
      user.memberSince = new Date();
      user.membershipStatus = MembershipStatus.ACTIVE;
      await this.usersRepository.save(user);
    }

    return booking;
  }
}
