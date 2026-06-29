import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../entities/booking.entity';
import { BookingStatus } from '../enums/booking-status.enum';
import { NpsService } from '../../nps/nps.service';
import { DoorAccessService } from '../../integrations/access-control/door-access.service';

@Injectable()
export class CompleteBookingProvider {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    private readonly npsService: NpsService,
    private readonly doorAccessService: DoorAccessService,
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

    if (saved.userId) {
      this.npsService
        .scheduleIfEligible(saved.userId, saved.id, saved.workspaceId, saved.startDate)
        .catch(() => void 0);
      this.doorAccessService.revokeAccess(saved.id).catch(() => void 0);
    }

    return saved;
  }
}
