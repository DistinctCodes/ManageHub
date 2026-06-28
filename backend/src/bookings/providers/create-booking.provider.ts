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
import { UserCredit } from '../../credits/entities/user-credit.entity';
import { UserCreditTransaction } from '../../credits/entities/credit-transaction.entity';
import { CreditTransactionType } from '../../credits/enums/credit-transaction-type.enum';
import { MembershipStatus } from '../../users/enums/membership-status.enum';
import { EmailService } from '../../email/email.service';

@Injectable()
export class CreateBookingProvider {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(UserCredit)
    private readonly userCreditsRepository: Repository<UserCredit>,
    @InjectRepository(UserCreditTransaction)
    private readonly creditTransactionsRepository: Repository<UserCreditTransaction>,
    private readonly pricingService: PricingService,
    private readonly dataSource: DataSource,
    private readonly emailService: EmailService,
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
      const overlap = await manager
        .createQueryBuilder(Booking, 'b')
        .select('COALESCE(SUM(b.seatCount), 0)', 'booked')
        .where('b.workspaceId = :workspaceId', {
          workspaceId: dto.workspaceId,
        })
        .andWhere('b.status IN (:...statuses)', {
          statuses: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
        })
        .andWhere('b.startDate <= :endDate', { endDate: dto.endDate })
        .andWhere('b.endDate >= :startDate', { startDate: dto.startDate })
        .getRawOne<{ booked: string }>();

      const alreadyBooked = Number(overlap?.booked ?? 0);
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

      // Handle credit payment
      if (dto.paymentMethod === 'credits') {
        const requiredHours = this.pricingService.calculateHours(
          dto.planType,
          dto.seatCount,
          dto.startDate,
          dto.endDate,
        );

        const userCredit = await manager
          .createQueryBuilder(UserCredit, 'uc')
          .setLock('pessimistic_write')
          .where('uc.userId = :userId', { userId })
          .getOne();

        if (!userCredit || Number(userCredit.remainingHours) < requiredHours) {
          throw new BadRequestException('Insufficient credit hours');
        }

        userCredit.remainingHours = Number(userCredit.remainingHours) - requiredHours;
        await manager.save(userCredit);

        const transaction = manager.create(UserCreditTransaction, {
          userCreditId: userCredit.id,
          type: CreditTransactionType.SPEND,
          hours: requiredHours,
          description: `Booking ${saved.id}`,
        });
        await manager.save(transaction);

        saved.status = BookingStatus.CONFIRMED;
        await manager.save(saved);

        const user = await manager.findOne(User, { where: { id: userId } });
        if (user && !user.memberSince) {
          user.memberSince = new Date();
          user.membershipStatus = MembershipStatus.ACTIVE;
          await manager.save(user);
        }
      }

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
