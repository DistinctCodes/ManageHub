import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Payment } from '../entities/payment.entity';
import { PaymentProvider } from '../enums/payment-provider.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaystackProvider } from './paystack.provider';
import { Booking } from '../../bookings/entities/booking.entity';
import { BookingStatus } from '../../bookings/enums/booking-status.enum';
import { User } from '../../users/entities/user.entity';

@Injectable()
export class InitializePaymentProvider {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly paystackProvider: PaystackProvider,
    private readonly configService: ConfigService,
  ) {}

  async initialize(
    bookingId: string,
    userId: string,
  ): Promise<{
    paymentId: string;
    authorizationUrl: string;
    reference: string;
  }> {
    const booking = await this.bookingsRepository.findOne({
      where: { id: bookingId, userId },
    });
    if (!booking) {
      throw new NotFoundException(`Booking "${bookingId}" not found`);
    }
    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException(
        'Only PENDING bookings can be paid. This booking is: ' + booking.status,
      );
    }

    // Check for existing pending payment for this booking
    const existing = await this.paymentsRepository.findOne({
      where: { bookingId, status: PaymentStatus.PENDING },
    });
    if (existing) {
      // Re-initialize using same reference
      const paystackData = await this.paystackProvider.initializeTransaction(
        (await this.usersRepository.findOne({ where: { id: userId } })).email,
        Number(booking.totalAmount),
        existing.id,
        this.configService.get('FRONTEND_PAYMENT_CALLBACK_URL'),
        { bookingId },
      );
      return {
        paymentId: existing.id,
        authorizationUrl: paystackData.authorization_url,
        reference: paystackData.reference,
      };
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });

    const payment = this.paymentsRepository.create({
      bookingId,
      userId,
      amount: Number(booking.totalAmount),
      provider: PaymentProvider.PAYSTACK,
      status: PaymentStatus.PENDING,
    });
    const savedPayment = await this.paymentsRepository.save(payment);

    const paystackData = await this.paystackProvider.initializeTransaction(
      user.email,
      Number(booking.totalAmount),
      savedPayment.id, // use payment UUID as Paystack reference
      this.configService.get('FRONTEND_PAYMENT_CALLBACK_URL'),
      { bookingId, userId },
    );

    savedPayment.providerReference = paystackData.reference;
    await this.paymentsRepository.save(savedPayment);

    return {
      paymentId: savedPayment.id,
      authorizationUrl: paystackData.authorization_url,
      reference: paystackData.reference,
    };
  }
}
