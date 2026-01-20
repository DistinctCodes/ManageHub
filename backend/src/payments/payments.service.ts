// backend/src/payments/payments.service.ts
import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { User } from '../auth/entities/user.entity';
import { InitializePaymentDto } from './dto/initialize-payment.dto';
import { PaystackService } from './paystack.service';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly paystackService: PaystackService,
  ) {}

  async initializePayment(
    userId: string,
    initializePaymentDto: InitializePaymentDto,
  ) {
    const { membershipType, paymentPlan, amount } = initializePaymentDto;

    // Get user
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate unique reference
    const reference = `MH-${uuidv4()}`;

    try {
      // Initialize payment with Paystack
      const paystackResponse = await this.paystackService.initializeTransaction(
        user.email,
        amount,
        reference,
        {
          user_id: userId,
          membership_type: membershipType,
          payment_plan: paymentPlan,
        },
      );

      // Create payment record
      const payment = this.paymentRepository.create({
        user: { id: userId },
        reference,
        amount,
        membershipType,
        paymentPlan,
        status: PaymentStatus.PENDING,
        paystackReference: paystackResponse.data.reference,
        accessCode: paystackResponse.data.access_code,
        metadata: {
          membership_type: membershipType,
          payment_plan: paymentPlan,
        },
      });

      await this.paymentRepository.save(payment);

      this.logger.log(`Payment initialized for user ${userId}: ${reference}`);

      return {
        success: true,
        message: 'Payment initialized successfully',
        data: {
          authorizationUrl: paystackResponse.data.authorization_url,
          accessCode: paystackResponse.data.access_code,
          reference: paystackResponse.data.reference,
        },
      };
    } catch (error) {
      this.logger.error(
        `Payment initialization failed for user ${userId}:`,
        error,
      );
      throw new InternalServerErrorException('Failed to initialize payment');
    }
  }

  async verifyPayment(reference: string) {
    // Find payment record
    const payment = await this.paymentRepository.findOne({
      where: { paystackReference: reference },
      relations: ['user'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Check if already verified
    if (payment.status === PaymentStatus.SUCCESS) {
      return {
        success: true,
        message: 'Payment already verified',
        data: {
          reference: payment.reference,
          amount: payment.amount,
          status: payment.status,
          paidAt: payment.paidAt,
        },
      };
    }

    try {
      // Verify with Paystack
      const paystackResponse =
        await this.paystackService.verifyTransaction(reference);

      if (paystackResponse.data.status === 'success') {
        // Update payment record
        payment.status = PaymentStatus.SUCCESS;
        payment.paidAt = new Date(paystackResponse.data.paid_at);
        await this.paymentRepository.save(payment);

        // Update user membership (if needed)
        // This could involve updating membership expiry dates, etc.

        this.logger.log(`Payment verified successfully: ${reference}`);

        return {
          success: true,
          message: 'Payment verified successfully',
          data: {
            reference: payment.reference,
            amount: payment.amount,
            status: payment.status,
            paidAt: payment.paidAt,
          },
        };
      } else {
        // Payment failed
        payment.status = PaymentStatus.FAILED;
        await this.paymentRepository.save(payment);

        throw new BadRequestException('Payment verification failed');
      }
    } catch (error) {
      this.logger.error(`Payment verification failed for ${reference}:`, error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException('Failed to verify payment');
    }
  }
}
