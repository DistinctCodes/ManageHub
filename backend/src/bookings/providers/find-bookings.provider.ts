import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../entities/booking.entity';
import { BookingQueryDto } from '../dto/booking-query.dto';
import { UserRole } from '../../users/enums/userRoles.enum';

export interface PaginatedBookings {
  data: Booking[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class FindBookingsProvider {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
  ) {}

  async findAll(
    query: BookingQueryDto,
    userId: string,
    userRole: UserRole,
  ): Promise<PaginatedBookings> {
    const {
      page = 1,
      limit = 20,
      status,
      workspaceId,
      startDate,
      endDate,
    } = query;

    const isAdmin =
      userRole === UserRole.ADMIN ||
      userRole === UserRole.SUPER_ADMIN ||
      userRole === UserRole.STAFF;

    const qb = this.bookingsRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.workspace', 'workspace')
      .leftJoinAndSelect('booking.user', 'user')
      .select([
        'booking',
        'workspace.id',
        'workspace.name',
        'workspace.type',
        'user.id',
        'user.firstname',
        'user.lastname',
        'user.email',
      ]);

    if (!isAdmin) {
      qb.where('booking.userId = :userId', { userId });
    } else if (query.userId) {
      qb.where('booking.userId = :userId', { userId: query.userId });
    }

    if (status) qb.andWhere('booking.status = :status', { status });
    if (workspaceId)
      qb.andWhere('booking.workspaceId = :workspaceId', { workspaceId });
    if (startDate)
      qb.andWhere('booking.startDate >= :startDate', { startDate });
    if (endDate) qb.andWhere('booking.endDate <= :endDate', { endDate });

    const total = await qb.getCount();
    const data = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('booking.createdAt', 'DESC')
      .getMany();

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(
    bookingId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<Booking> {
    const isAdmin =
      userRole === UserRole.ADMIN ||
      userRole === UserRole.SUPER_ADMIN ||
      userRole === UserRole.STAFF;

    const booking = await this.bookingsRepository.findOne({
      where: { id: bookingId },
      relations: ['workspace', 'user'],
    });
    if (!booking) {
      throw new NotFoundException(`Booking "${bookingId}" not found`);
    }
    if (!isAdmin && booking.userId !== userId) {
      throw new NotFoundException(`Booking "${bookingId}" not found`);
    }
    return booking;
  }
}
