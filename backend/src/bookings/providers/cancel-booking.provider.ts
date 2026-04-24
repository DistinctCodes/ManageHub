import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../entities/booking.entity';
import { BookingStatus } from '../enums/booking-status.enum';
import { UserRole } from '../../users/enums/userRoles.enum';
import { User } from '../../users/entities/user.entity';
import { EmailService } from '../../email/email.service';
import { WorkspacesService } from '../../workspaces/workspaces.service';
import { WaitlistProvider } from '../../sandbox/waitlist/providers/waitlist.provider';

@Injectable()
export class CancelBookingProvider {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly emailService: EmailService,
    private readonly workspacesService: WorkspacesService,
    @Optional() private readonly waitlistProvider?: WaitlistProvider,
  ) {}

  async cancel(
    bookingId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<Booking> {
    const booking = await this.bookingsRepository.findOne({
      where: { id: bookingId },
    });
    if (!booking) {
      throw new NotFoundException(`Booking "${bookingId}" not found`);
    }

    const isAdmin =
      userRole === UserRole.ADMIN ||
      userRole === UserRole.SUPER_ADMIN ||
      userRole === UserRole.STAFF;

    if (!isAdmin && booking.userId !== userId) {
      throw new ForbiddenException('You can only cancel your own bookings');
    }

    if (
      booking.status !== BookingStatus.PENDING &&
      booking.status !== BookingStatus.CONFIRMED
    ) {
      throw new BadRequestException(
        'Only PENDING or CONFIRMED bookings can be cancelled',
      );
    }

    booking.status = BookingStatus.CANCELLED;
    const saved = await this.bookingsRepository.save(booking);

    // Fire-and-forget cancellation email
    Promise.all([
      this.usersRepository.findOne({ where: { id: saved.userId } }),
      this.workspacesService.findById(saved.workspaceId),
    ])
      .then(([user, workspace]) => {
        if (!user || !workspace) return;
        const cancelledBy =
          saved.userId === userId ? user.fullName : 'Administrator';
        this.emailService
          .sendBookingCancelledEmail(user.email, user.fullName, {
            bookingId: saved.id,
            workspaceName: workspace.name,
            startDate: saved.startDate,
            endDate: saved.endDate,
            cancelledBy,
          })
          .catch(() => void 0);
      })
      .catch(() => void 0);

    // Notify first waitlist entry for this workspace/date
    if (this.waitlistProvider) {
      this.waitlistProvider
        .notifyFirstInQueue(saved.workspaceId, saved.startDate)
        .catch(() => void 0);
    }

    return saved;
  }
}
