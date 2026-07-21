import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../entities/booking.entity';
import { BookingStatus } from '../enums/booking-status.enum';
import { WorkspacesService } from '../../workspaces/workspaces.service';

@Injectable()
export class CompleteBookingProvider {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    private readonly workspacesService: WorkspacesService,
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
    const saved = await this.bookingsRepository.save(booking);

    // Free up the approximate availableSeats counter (see Workspace entity):
    // COMPLETED bookings, like CANCELLED ones, no longer count against
    // CheckWorkspaceAvailabilityProvider's live overlap query.
    await this.workspacesService.adjustAvailableSeats(
      saved.workspaceId,
      saved.seatCount,
    );

    return saved;
  }
}
