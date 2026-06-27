import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Booking } from '../entities/booking.entity';
import { CreatePublicBookingDto } from '../dto/create-public-booking.dto';
import { BookingStatus } from '../enums/booking-status.enum';
import { PlanType } from '../enums/plan-type.enum';
import { PricingService } from '../pricing/pricing.service';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { PaymentProvider } from '../../payments/enums/payment-provider.enum';
import { PaymentStatus } from '../../payments/enums/payment-status.enum';
import { PaystackProvider } from '../../payments/providers/paystack.provider';

@Injectable()
export class CreatePublicDayPassProvider {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    private readonly pricingService: PricingService,
    private readonly paystackProvider: PaystackProvider,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreatePublicBookingDto): Promise<{
    bookingId: string;
    paymentId: string;
    authorizationUrl: string;
    reference: string;
  }> {
    const today = new Date().toISOString().split('T')[0];
    if (dto.date < today) {
      throw new BadRequestException('date must be today or a future date');
    }

    return this.dataSource.transaction(async (manager) => {
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

      const overlap = await manager
        .createQueryBuilder(Booking, 'b')
        .select('COALESCE(SUM(b.seatCount), 0)', 'booked')
        .where('b.workspaceId = :workspaceId', { workspaceId: dto.workspaceId })
        .andWhere('b.status IN (:...statuses)', {
          statuses: [BookingStatus.PENDING, BookingStatus.CONFIRMED],
        })
        .andWhere('b.startDate <= :date', { date: dto.date })
        .andWhere('b.endDate >= :date', { date: dto.date })
        .getRawOne<{ booked: string }>();

      const alreadyBooked = Number(overlap?.booked ?? 0);
      if (alreadyBooked + 1 > workspace.totalSeats) {
        throw new ConflictException(
          'No seats available for the requested date',
        );
      }

      const totalAmount = this.pricingService.calculateAmount(
        Number(workspace.hourlyRate),
        PlanType.DAILY,
        1,
        dto.date,
        dto.date,
      );

      const booking = manager.create(Booking, {
        workspaceId: dto.workspaceId,
        userId: null,
        planType: PlanType.DAILY,
        startDate: dto.date,
        endDate: dto.date,
        seatCount: 1,
        totalAmount,
        status: BookingStatus.PENDING,
        isGuestBooking: true,
        guestInfo: {
          name: dto.guestName,
          email: dto.guestEmail,
          phone: dto.guestPhone,
        },
      });

      const savedBooking = await manager.save(booking);

      const payment = manager.create(Payment, {
        bookingId: savedBooking.id,
        userId: null,
        amount: totalAmount,
        provider: PaymentProvider.PAYSTACK,
        status: PaymentStatus.PENDING,
      });
      const savedPayment = await manager.save(payment);

      const callbackUrl = this.configService.get<string>(
        'FRONTEND_PAYMENT_CALLBACK_URL',
      );
      const paystackData = await this.paystackProvider.initializeTransaction(
        dto.guestEmail,
        totalAmount,
        savedPayment.id,
        callbackUrl,
        { bookingId: savedBooking.id, isGuestBooking: true },
      );

      savedPayment.providerReference = paystackData.reference;
      await manager.save(savedPayment);

      return {
        bookingId: savedBooking.id,
        paymentId: savedPayment.id,
        authorizationUrl: paystackData.authorization_url,
        reference: paystackData.reference,
      };
    });
  }
}
