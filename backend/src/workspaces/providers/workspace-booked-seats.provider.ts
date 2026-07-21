import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Booking } from '../../bookings/entities/booking.entity';
import { BookingStatus } from '../../bookings/enums/booking-status.enum';

/**
 * Shared overlap query used by both booking creation (conflict check) and
 * workspace availability reads, so the two paths can never drift apart.
 */
@Injectable()
export class WorkspaceBookedSeatsProvider {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
  ) {}

  /**
   * Sums seatCount of PENDING/CONFIRMED bookings that overlap [startDate, endDate]
   * for a workspace. Pass `manager` to read inside an existing transaction
   * (e.g. under the pessimistic row lock taken in CreateBookingProvider).
   */
  async getBookedSeats(
    workspaceId: string,
    startDate: string,
    endDate: string,
    manager?: EntityManager,
  ): Promise<number> {
    const runner = manager ?? this.bookingsRepository.manager;

    const overlap = await runner
      .createQueryBuilder(Booking, 'b')
      .select('COALESCE(SUM(b.seatCount), 0)', 'booked')
      .where('b.workspaceId = :workspaceId', { workspaceId })
      .andWhere('b.status IN (:...statuses)', {
        statuses: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
      })
      .andWhere('b.startDate <= :endDate', { endDate })
      .andWhere('b.endDate >= :startDate', { startDate })
      .getRawOne<{ booked: string }>();

    return Number(overlap?.booked ?? 0);
  }
}
