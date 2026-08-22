import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { RequestUser } from '../auth/interfaces/authenticated-request.interface';
import { UserRole } from '../auth/enums/user-role.enum';
import { Payment } from './entities/payment.entity';
import { InitiatePaymentDto } from './dto/initiate-payment.dto';
import {
  NON_TERMINAL_PAYMENT_STATUSES,
  PaymentStatus,
} from './enums/payment-status.enum';
import { assertValidTransition } from './payment-state-machine';
import { PaymentRailRegistry } from './payment-rail-registry';

const USER_IDEMPOTENCY_KEY_CONSTRAINT = 'uq_payments_user_id_idempotency_key';
const BOOKING_NON_TERMINAL_CONSTRAINT = 'uq_payments_booking_id_non_terminal';
const POSTGRES_UNIQUE_VIOLATION = '23505';

const BLOCKING_STATUSES_FOR_NEW_PAYMENT = [
  ...NON_TERMINAL_PAYMENT_STATUSES,
  PaymentStatus.CONFIRMED,
];

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly railRegistry: PaymentRailRegistry,
    private readonly config: ConfigService,
  ) {}

  async initiate(
    userId: string,
    idempotencyKey: string,
    dto: InitiatePaymentDto,
  ): Promise<Payment> {
    if (!idempotencyKey) {
      throw new BadRequestException('Idempotency-Key header is required');
    }

    const existing = await this.findByIdempotencyKey(userId, idempotencyKey);
    if (existing) {
      return this.assertSamePayload(existing, dto);
    }

    await this.assertBookingAvailable(dto.bookingId);

    const payment = this.buildInitiatedPayment(userId, idempotencyKey, dto);

    try {
      const saved = await this.paymentRepository.save(payment);
      return await this.progressToAwaitingConfirmation(saved);
    } catch (error) {
      return this.handleInsertConflict(error, userId, idempotencyKey);
    }
  }

  async findOne(id: string, currentUser: RequestUser): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({ where: { id } });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    this.assertCanView(payment, currentUser);
    return payment;
  }

  async findAll(currentUser: RequestUser): Promise<Payment[]> {
    if (currentUser.role === UserRole.ADMIN) {
      return this.paymentRepository.find();
    }
    return this.paymentRepository.find({ where: { userId: currentUser.id } });
  }

  /**
   * The only sanctioned way to change Payment#status. Every write path in
   * this service must route through here so illegal transitions throw
   * instead of silently corrupting state.
   */
  transitionStatus(payment: Payment, next: PaymentStatus): Payment {
    assertValidTransition(payment.status, next);
    payment.status = next;
    return payment;
  }

  private async findByIdempotencyKey(
    userId: string,
    idempotencyKey: string,
  ): Promise<Payment | null> {
    return this.paymentRepository.findOne({
      where: { userId, idempotencyKey },
    });
  }

  private assertSamePayload(
    existing: Payment,
    dto: InitiatePaymentDto,
  ): Payment {
    const samePayload =
      existing.bookingId === dto.bookingId &&
      existing.amount === dto.amount &&
      existing.currency === dto.currency.toUpperCase() &&
      existing.rail === dto.rail;

    if (!samePayload) {
      throw new ConflictException(
        'Idempotency-Key was already used with a different payload',
      );
    }
    return existing;
  }

  private async assertBookingAvailable(bookingId: string): Promise<void> {
    const blocking = await this.paymentRepository.findOne({
      where: {
        bookingId,
        status: In(BLOCKING_STATUSES_FOR_NEW_PAYMENT),
      },
    });
    if (blocking) {
      throw new ConflictException(
        blocking.status === PaymentStatus.CONFIRMED
          ? 'This booking already has a confirmed payment'
          : 'This booking already has a payment in progress',
      );
    }
  }

  private buildInitiatedPayment(
    userId: string,
    idempotencyKey: string,
    dto: InitiatePaymentDto,
  ): Payment {
    const ttlMinutes = this.config.get<number>(
      'PAYMENT_INITIATED_TTL_MINUTES',
      30,
    );
    return this.paymentRepository.create({
      bookingId: dto.bookingId,
      userId,
      amount: dto.amount,
      currency: dto.currency.toUpperCase(),
      rail: dto.rail,
      provider: dto.provider ?? null,
      status: PaymentStatus.INITIATED,
      idempotencyKey,
      metadata: dto.metadata ?? null,
      expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
    });
  }

  private async progressToAwaitingConfirmation(
    payment: Payment,
  ): Promise<Payment> {
    const result = await this.railRegistry.get(payment.rail).initiate(payment);
    payment.providerReference = result.providerReference;
    this.transitionStatus(payment, PaymentStatus.AWAITING_CONFIRMATION);
    return this.paymentRepository.save(payment);
  }

  /**
   * Two initiate() calls can race past the pre-checks above and both reach
   * the insert. Only one wins; the DB unique constraints are the actual
   * source of truth. The loser recovers here instead of erroring.
   */
  private async handleInsertConflict(
    error: unknown,
    userId: string,
    idempotencyKey: string,
  ): Promise<Payment> {
    if (!this.isUniqueViolation(error)) {
      throw error;
    }

    if (this.violatedConstraint(error) === USER_IDEMPOTENCY_KEY_CONSTRAINT) {
      const winner = await this.findByIdempotencyKey(userId, idempotencyKey);
      if (winner) {
        return winner;
      }
    }

    if (this.violatedConstraint(error) === BOOKING_NON_TERMINAL_CONSTRAINT) {
      throw new ConflictException(
        'This booking already has a payment in progress',
      );
    }

    throw error;
  }

  private isUniqueViolation(error: unknown): boolean {
    const code = (error as any)?.code ?? (error as any)?.driverError?.code;
    return code === POSTGRES_UNIQUE_VIOLATION;
  }

  private violatedConstraint(error: unknown): string | undefined {
    return (
      (error as any)?.constraint ?? (error as any)?.driverError?.constraint
    );
  }

  private assertCanView(payment: Payment, currentUser: RequestUser): void {
    const isOwner = payment.userId === currentUser.id;
    const isAdmin = currentUser.role === UserRole.ADMIN;
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('You may not view this payment');
    }
  }
}
