// @ts-nocheck
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { Workbook } from 'exceljs';
import { Parser } from 'json2csv';

export interface BookingExportFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
}

@Injectable()
export class BookingsExportService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepository: Repository<Booking>,
  ) {}

  private async findBookings(filters?: BookingExportFilters) {
    const qb = this.bookingsRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.workspace', 'workspace')
      .leftJoinAndSelect('booking.user', 'user')
      .select([
        'booking',
        'workspace.id',
        'workspace.name',
        'user.id',
        'user.firstname',
        'user.lastname',
        'user.email',
      ]);

    if (filters?.status) {
      qb.andWhere('booking.status = :status', { status: filters.status });
    }

    if (filters?.startDate) {
      qb.andWhere('booking.startDate >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters?.endDate) {
      qb.andWhere('booking.endDate <= :endDate', {
        endDate: filters.endDate,
      });
    }

    qb.orderBy('booking.createdAt', 'DESC');
    return qb.getMany();
  }

  private mapBooking(b: Booking) {
    return {
      id: b.id,
      workspace: b.workspace?.name ?? '',
      user: b.user ? `${b.user.firstname} ${b.user.lastname}` : '',
      status: b.status,
      startTime: b.startDate ?? '',
      endTime: b.endDate ?? '',
      amount: b.totalAmount ? `₦${(b.totalAmount / 100).toFixed(2)}` : '',
    };
  }

  async exportBookingsCsv(filters?: BookingExportFilters): Promise<Buffer> {
    const bookings = await this.findBookings(filters);
    const data = bookings.map((b) => this.mapBooking(b));

    const parser = new Parser({
      fields: ['id', 'workspace', 'user', 'status', 'startTime', 'endTime', 'amount'],
    });

    return Buffer.from(parser.parse(data), 'utf-8');
  }

  async exportBookingsExcel(filters?: BookingExportFilters): Promise<Buffer> {
    const bookings = await this.findBookings(filters);

    const workbook = new Workbook();
    workbook.creator = 'ManageHub';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Bookings');
    sheet.columns = [
      { header: 'ID', key: 'id', width: 38 },
      { header: 'Workspace', key: 'workspace', width: 25 },
      { header: 'User', key: 'user', width: 25 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Start Time', key: 'startTime', width: 22 },
      { header: 'End Time', key: 'endTime', width: 22 },
      { header: 'Amount', key: 'amount', width: 15 },
    ];

    sheet.getRow(1).font = { bold: true };

    bookings.forEach((b) => {
      sheet.addRow(this.mapBooking(b));
    });

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
