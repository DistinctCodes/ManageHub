import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Booking } from '../bookings/entities/booking.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepository: Repository<Booking>,
  ) {}

  async getBookingsReport(from: Date, to: Date, groupBy: string) {
    const bookings = await this.bookingRepository.find({
      where: { createdAt: Between(from, to) },
    });

    const grouped = this.groupByPeriod(bookings, groupBy);

    return {
      summary: {
        total: bookings.length,
        confirmed: bookings.filter((b) => b.status === 'CONFIRMED').length,
        cancelled: bookings.filter((b) => b.status === 'CANCELLED').length,
      },
      data: grouped,
    };
  }

  private groupByPeriod(items: any[], groupBy: string) {
    const groups: Record<string, number> = {};

    items.forEach((item) => {
      const date = new Date(item.createdAt);
      let key: string;

      if (groupBy === 'day') {
        key = date.toISOString().split('T')[0];
      } else if (groupBy === 'week') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }

      groups[key] = (groups[key] || 0) + 1;
    });

    return Object.entries(groups).map(([period, count]) => ({ period, count }));
  }
}
