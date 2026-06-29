import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Booking } from '../../bookings/entities/booking.entity';
import { User } from '../../users/entities/user.entity';
import { Payment } from '../../payments/entities/payment.entity';
import { Invoice } from '../../invoices/entities/invoice.entity';
import { Response } from 'express';

function toCsv(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  return [headers, ...rows].map((row) => row.map(escape).join(',')).join('\n');
}

function dateFilter(from?: string, to?: string) {
  if (from && to) return Between(new Date(from), new Date(to));
  if (from) return MoreThanOrEqual(new Date(from));
  if (to) return LessThanOrEqual(new Date(to));
  return undefined;
}

@Injectable()
export class ExportProvider {
  constructor(
    @InjectRepository(Booking) private bookingRepo: Repository<Booking>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Payment) private paymentRepo: Repository<Payment>,
    @InjectRepository(Invoice) private invoiceRepo: Repository<Invoice>,
  ) {}

  private setHeaders(res: Response, filename: string) {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  }

  async exportBookings(res: Response, from?: string, to?: string) {
    const filter = dateFilter(from, to);
    const bookings = await this.bookingRepo.find({
      where: filter ? { createdAt: filter } : {},
      relations: ['user', 'workspace'],
      order: { createdAt: 'DESC' },
    });

    const headers = ['bookingId', 'memberName', 'workspace', 'planType', 'startDate', 'endDate', 'amount', 'status'];
    const rows = bookings.map((b) => [
      b.id,
      b.user ? `${b.user.firstname} ${b.user.lastname}` : '',
      b.workspace?.name ?? '',
      b.planType,
      b.startDate,
      b.endDate,
      String(b.totalAmount),
      b.status,
    ]);

    this.setHeaders(res, `bookings-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(toCsv(headers, rows));
  }

  async exportMembers(res: Response, from?: string, to?: string) {
    const filter = dateFilter(from, to);
    const users = await this.userRepo.find({
      where: filter ? { createdAt: filter } : {},
      order: { createdAt: 'DESC' },
    });

    const headers = ['memberId', 'name', 'email', 'role', 'membershipStatus', 'joinedAt'];
    const rows = users.map((u) => [
      u.id,
      `${u.firstname} ${u.lastname}`,
      u.email,
      u.role,
      u.membershipStatus,
      u.createdAt.toISOString(),
    ]);

    this.setHeaders(res, `members-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(toCsv(headers, rows));
  }

  async exportRevenue(res: Response, from?: string, to?: string) {
    const filter = dateFilter(from, to);
    const payments = await this.paymentRepo.find({
      where: filter ? { createdAt: filter } : {},
      order: { createdAt: 'ASC' },
    });

    // Group by date
    const byDate = new Map<string, { total: number; count: number }>();
    for (const p of payments) {
      const date = p.createdAt.toISOString().split('T')[0];
      const existing = byDate.get(date) ?? { total: 0, count: 0 };
      existing.total += Number(p.amount);
      existing.count += 1;
      byDate.set(date, existing);
    }

    const headers = ['date', 'totalRevenue', 'bookingCount', 'averageBookingValue'];
    const rows = [...byDate.entries()].map(([date, { total, count }]) => [
      date,
      String(total),
      String(count),
      String(count > 0 ? Math.round(total / count) : 0),
    ]);

    this.setHeaders(res, `revenue-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(toCsv(headers, rows));
  }

  async exportInvoices(res: Response, from?: string, to?: string) {
    const filter = dateFilter(from, to);
    const invoices = await this.invoiceRepo.find({
      where: filter ? { createdAt: filter } : {},
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });

    const headers = ['invoiceNumber', 'member', 'amount', 'status', 'issuedAt', 'paidAt'];
    const rows = invoices.map((inv) => [
      inv.invoiceNumber,
      inv.user ? `${inv.user.firstname} ${inv.user.lastname}` : '',
      String((inv as any).totalAmount ?? (inv as any).amount ?? 0),
      inv.status,
      inv.createdAt.toISOString(),
      (inv as any).paidAt ? new Date((inv as any).paidAt).toISOString() : '',
    ]);

    this.setHeaders(res, `invoices-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(toCsv(headers, rows));
  }
}
