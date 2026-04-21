import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Invoice } from '../entities/invoice.entity';
import { InvoiceQueryDto } from '../dto/invoice-query.dto';
import { UserRole } from '../../users/enums/userRoles.enum';

@Injectable()
export class FindInvoicesProvider {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoicesRepository: Repository<Invoice>,
  ) {}

  async findAll(
    query: InvoiceQueryDto,
    requestingUserId: string,
    requestingUserRole: UserRole,
  ): Promise<{ data: Invoice[]; total: number; page: number; limit: number }> {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const isAdmin =
      requestingUserRole === UserRole.ADMIN ||
      requestingUserRole === UserRole.SUPER_ADMIN ||
      requestingUserRole === UserRole.STAFF;

    const qb = this.invoicesRepository.createQueryBuilder('invoice');

    if (!isAdmin) {
      qb.where('invoice.userId = :userId', { userId: requestingUserId });
    }

    if (query.status) {
      qb.andWhere('invoice.status = :status', { status: query.status });
    }

    if (query.bookingId) {
      qb.andWhere('invoice.bookingId = :bookingId', {
        bookingId: query.bookingId,
      });
    }

    qb.orderBy('invoice.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findById(
    invoiceId: string,
    requestingUserId: string,
    requestingUserRole: UserRole,
  ): Promise<Invoice> {
    const isAdmin =
      requestingUserRole === UserRole.ADMIN ||
      requestingUserRole === UserRole.SUPER_ADMIN ||
      requestingUserRole === UserRole.STAFF;

    const qb = this.invoicesRepository
      .createQueryBuilder('invoice')
      .where('invoice.id = :id', { id: invoiceId });

    if (!isAdmin) {
      qb.andWhere('invoice.userId = :userId', { userId: requestingUserId });
    }

    const invoice = await qb.getOne();
    if (!invoice) {
      throw new NotFoundException(`Invoice "${invoiceId}" not found`);
    }
    return invoice;
  }
}
