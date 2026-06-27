import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { Booking } from '../entities/booking.entity';
import { BookingStatus } from '../enums/booking-status.enum';

@Injectable()
export class CancelRecurringBookingProvider {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepo: Repository<Booking>,
  ) {}

  async cancelGroup(groupId: string, userId: string): Promise<{ cancelled: number }> {
    const today = new Date().toISOString().split('T')[0];

    const future = await this.bookingsRepo.find({
      where: {
        recurringGroupId: groupId,
        status: BookingStatus.PENDING,
      },
    });

    const toCancel = future.filter((b) => b.startDate > today);

    if (!toCancel.length) {
      throw new NotFoundException('No future bookings found for this group');
    }

    await this.bookingsRepo.save(
      toCancel.map((b) => ({ ...b, status: BookingStatus.CANCELLED })),
    );

    return { cancelled: toCancel.length };
  }
}
