import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Response } from 'express';
import { parse } from 'json2csv';
import { Booking } from '../../../bookings/entities/booking.entity';
import { BookingReportQueryDto } from '../dto/booking-report-query.dto';

@Injectable()
export class BookingCsvProvider {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepo: Repository<Booking>,
  ) {}

  async streamCsv(query: BookingReportQueryDto, res: Response): Promise<void> {
    const qb = this.bookingsRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.user', 'user')
      .leftJoinAndSelect('b.workspace', 'workspace')
      .orderBy('b.createdAt', 'DESC');

    if (query.status)
      qb.andWhere('b.status = :status', { status: query.status });
    if (query.from) qb.andWhere('b.startDate >= :from', { from: query.from });
    if (query.to) qb.andWhere('b.endDate <= :to', { to: query.to });
    if (query.workspaceId)
      qb.andWhere('b.workspaceId = :workspaceId', {
        workspaceId: query.workspaceId,
      });

    const bookings = await qb.getMany();

    const rows = bookings.map((b) => ({
      bookingId: b.id,
      userName: b.user ? `${b.user.firstname} ${b.user.lastname}`.trim() : '',
      userEmail: b.user?.email ?? '',
      workspaceName: b.workspace?.name ?? '',
      planType: b.planType,
      startDate: b.startDate,
      endDate: b.endDate,
      totalAmount: (Number(b.totalAmount) / 100).toFixed(2),
      status: b.status,
    }));

    const fields = [
      'bookingId',
      'userName',
      'userEmail',
      'workspaceName',
      'planType',
      'startDate',
      'endDate',
      'totalAmount',
      'status',
    ];

    const csv = parse(rows, { fields });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="bookings.csv"');
    res.send(csv);
  }
}
