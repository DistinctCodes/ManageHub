import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Booking } from '../../../bookings/entities/booking.entity';
import { BookingStatus } from '../../../bookings/enums/booking-status.enum';

@Injectable()
export class BulkCancelProvider {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepo: Repository<Booking>,
  ) {}

  async bulkCancel(bookingIds: string[]) {
    const bookings = await this.bookingsRepo.find({
      where: { id: In(bookingIds) },
    });

    const cancellable = bookings.filter(
      (b) =>
        b.status === BookingStatus.PENDING ||
        b.status === BookingStatus.CONFIRMED,
    );
    const skippedIds = bookingIds.filter(
      (id) => !cancellable.some((b) => b.id === id),
    );

    if (cancellable.length > 0) {
      await this.bookingsRepo.manager.transaction(async (em) => {
        await em.update(
          Booking,
          { id: In(cancellable.map((b) => b.id)) },
          { status: BookingStatus.CANCELLED },
        );
      });
    }

    return {
      cancelled: cancellable.length,
      skipped: skippedIds.length,
      skippedIds,
    };
  }
}
