import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Booking } from '../entities/booking.entity';
import { CreateBookingDto } from '../dto/create-booking.dto';
import { BookingStatus } from '../enums/booking-status.enum';
import { PricingService } from '../pricing/pricing.service';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { User } from '../../users/entities/user.entity';
import { EmailService } from '../../email/email.service';
import { WorkspaceBookedSeatsProvider } from '../../workspaces/providers/workspace-booked-seats.provider';

@Injectable()
export class CreateBookingProvider {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly pricingService: PricingService,
    private readonly dataSource: DataSource,
    private readonly emailService: EmailService,
    private readonly workspaceBookedSeatsProvider: WorkspaceBookedSeatsProvider,
  ) {}

  async create(dto: CreateBookingDto, userId: string): Promise<Booking> {
    if (new Date(dto.endDate) <= new Date(dto.startDate)) {
      throw new BadRequestException('endDate must be after startDate');
    }

    return this.dataSource.transaction(async (manager) => {
      // Lock the workspace row to prevent concurrent seat over-booking
      const workspace = await manager
        .createQueryBuilder(Workspace, 'w')
        .setLock('pessimistic_write')
        .where('w.id = :id', { id: dto.workspaceId })
        .getOne();

      if (!workspace) {
        throw new NotFoundException(`Workspace "${dto.workspaceId}" not found`);
      }
      if (!workspace.isActive) {
        throw new BadRequestException('Workspace is not active');
      }

      // Conflict check: sum existing confirmed/pending seat counts for overlapping dates
      const alreadyBooked =
        await this.workspaceBookedSeatsProvider.getBookedSeats(
          dto.workspaceId,
          dto.startDate,
          dto.endDate,
          manager,
        );

      if (alreadyBooked + dto.seatCount > workspace.totalSeats) {
        throw new ConflictException(
          `Only ${workspace.totalSeats - alreadyBooked} seat(s) available for the requested dates`,
        );
      }

      const totalAmount = this.pricingService.calculateAmount(
        Number(workspace.hourlyRate),
        dto.planType,
        dto.seatCount,
        dto.startDate,
        dto.endDate,
      );

      const booking = manager.create(Booking, {
        ...dto,
        userId,
        totalAmount,
        status: BookingStatus.PENDING,
      });

      const saved = await manager.save(booking);

      // Keep the approximate availableSeats counter in sync (see Workspace entity).
      workspace.availableSeats = Math.max(
        workspace.availableSeats - dto.seatCount,
        0,
      );
      await manager.save(Workspace, workspace);

      // Fire-and-forget booking created email
      this.usersRepository
        .findOne({ where: { id: userId } })
        .then((user) => {
          if (!user) return;
          this.emailService
            .sendBookingCreatedEmail(user.email, user.fullName, {
              bookingId: saved.id,
              workspaceName: workspace.name,
              planType: saved.planType,
              startDate: saved.startDate,
              endDate: saved.endDate,
              seatCount: saved.seatCount,
              totalAmountNaira: (totalAmount / 100).toFixed(2),
            })
            .catch(() => void 0);
        })
        .catch(() => void 0);

      return saved;
    });
  }
}
