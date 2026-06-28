import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BillingCycle, BillingCycleStatus } from './entities/billing-cycle.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { BookingStatus } from '../bookings/enums/booking-status.enum';
import { PlanType } from '../bookings/enums/plan-type.enum';

@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    @InjectRepository(BillingCycle)
    private readonly cycleRepo: Repository<BillingCycle>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async generateMonthlyBillingCycles(): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const monthlyBookings = await this.bookingRepo.find({
      where: {
        planType: PlanType.MONTHLY,
        status: BookingStatus.CONFIRMED,
      },
    });

    for (const booking of monthlyBookings) {
      const existing = await this.cycleRepo.findOne({
        where: { bookingId: booking.id, periodStart: today },
      });
      if (existing) continue;

      const end = new Date(today);
      end.setMonth(end.getMonth() + 1);
      end.setDate(end.getDate() - 1);

      const cycle = this.cycleRepo.create({
        bookingId: booking.id,
        userId: booking.userId ?? '',
        periodStart: today,
        periodEnd: end.toISOString().split('T')[0],
        amountKobo: booking.totalAmount,
        status: BillingCycleStatus.PENDING,
      });

      await this.cycleRepo.save(cycle);
      this.logger.log(`Created billing cycle for booking ${booking.id}`);
    }
  }

  async findAll(userId?: string): Promise<BillingCycle[]> {
    const where: any = {};
    if (userId) where.userId = userId;
    return this.cycleRepo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findPendingForRetry(): Promise<BillingCycle[]> {
    return this.cycleRepo.find({
      where: {
        status: BillingCycleStatus.FAILED,
        nextRetryAt: LessThanOrEqual(new Date()),
      },
    });
  }

  async markFailed(id: string, reason: string, retryAt: Date): Promise<void> {
    await this.cycleRepo.update(id, {
      status: BillingCycleStatus.FAILED,
      failureReason: reason,
      nextRetryAt: retryAt,
    });
  }

  async markPaid(id: string, invoiceId: string): Promise<void> {
    await this.cycleRepo.update(id, {
      status: BillingCycleStatus.PAID,
      invoiceId,
      nextRetryAt: null,
      failureReason: null,
    });
  }

  async incrementRetry(id: string): Promise<void> {
    const cycle = await this.cycleRepo.findOneOrFail({ where: { id } });
    await this.cycleRepo.update(id, { retryCount: cycle.retryCount + 1 });
  }
}
