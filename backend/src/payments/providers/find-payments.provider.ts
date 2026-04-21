import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from '../entities/payment.entity';
import { UserRole } from '../../users/enums/userRoles.enum';

export class PaymentQuery {
  page?: number;
  limit?: number;
  bookingId?: string;
}

@Injectable()
export class FindPaymentsProvider {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
  ) {}

  async findAll(
    query: PaymentQuery,
    requestingUserId: string,
    requestingUserRole: UserRole,
  ): Promise<{ data: Payment[]; total: number; page: number; limit: number }> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const isAdmin =
      requestingUserRole === UserRole.ADMIN ||
      requestingUserRole === UserRole.SUPER_ADMIN ||
      requestingUserRole === UserRole.STAFF;

    const qb = this.paymentsRepository.createQueryBuilder('payment');

    if (!isAdmin) {
      qb.where('payment.userId = :userId', { userId: requestingUserId });
    }

    if (query.bookingId) {
      qb.andWhere('payment.bookingId = :bookingId', {
        bookingId: query.bookingId,
      });
    }

    qb.orderBy('payment.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findById(
    paymentId: string,
    requestingUserId: string,
    requestingUserRole: UserRole,
  ): Promise<Payment | null> {
    const isAdmin =
      requestingUserRole === UserRole.ADMIN ||
      requestingUserRole === UserRole.SUPER_ADMIN ||
      requestingUserRole === UserRole.STAFF;

    const qb = this.paymentsRepository
      .createQueryBuilder('payment')
      .where('payment.id = :id', { id: paymentId });

    if (!isAdmin) {
      qb.andWhere('payment.userId = :userId', { userId: requestingUserId });
    }

    return qb.getOne();
  }
}
