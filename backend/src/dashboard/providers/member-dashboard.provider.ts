import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Booking } from '../../bookings/entities/booking.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { Invoice } from '../../payments/entities/invoice.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { BookingStatus } from '../../bookings/enums/booking-status.enum';
import { PaymentStatus } from '../../payments/entities/payment.entity';

@Injectable()
export class MemberDashboardProvider {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
  ) {}

  async getMemberDashboard(userId: string) {
    // Get active bookings (pending + confirmed)
    const activeBookingsCount = await this.bookingRepository.count({
      where: {
        userId,
        status: In([BookingStatus.PENDING, BookingStatus.CONFIRMED]),
      },
    });

    // Get total spent (successful payments)
    const successfulPayments = await this.paymentRepository.find({
      where: {
        userId,
        status: PaymentStatus.SUCCESSFUL,
      },
      select: ['amountKobo'],
    });

    const totalSpentKobo = successfulPayments.reduce(
      (sum, payment) => sum + payment.amountKobo,
      0,
    );

    // Get invoice count
    const invoiceCount = await this.invoiceRepository.count({
      where: { userId },
    });

    // Get last check-in (most recent workspace log)
    const lastCheckIn = await this.workspaceRepository
      .createQueryBuilder('workspace')
      .innerJoin('workspace.workspaceLogs', 'log')
      .where('log.userId = :userId', { userId })
      .andWhere('log.checkIn IS NOT NULL')
      .orderBy('log.checkIn', 'DESC')
      .select(['log.checkIn'])
      .getOne();

    // Get recent bookings (5 most recent)
    const recentBookings = await this.bookingRepository.find({
      where: { userId },
      relations: ['workspace'],
      order: { createdAt: 'DESC' },
      take: 5,
    });

    // Get recent successful payments (5 most recent)
    const recentPayments = await this.paymentRepository.find({
      where: {
        userId,
        status: PaymentStatus.SUCCESSFUL,
      },
      relations: ['booking'],
      order: { createdAt: 'DESC' },
      take: 5,
    });

    return {
      stats: {
        activeBookings: activeBookingsCount,
        totalSpentKobo,
        invoiceCount,
        lastCheckIn: lastCheckIn ? lastCheckIn.createdAt : null,
      },
      recentBookings,
      recentPayments,
    };
  }
}
