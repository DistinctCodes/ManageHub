import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { Booking } from '../bookings/entities/booking.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { User } from '../users/entities/user.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
  ) {}

  private dateRange(from?: string, to?: string) {
    const start = from ? new Date(from) : new Date(Date.now() - 30 * 86400000);
    const end = to ? new Date(to) : new Date();
    return Between(start, end);
  }

  async bookingsReport(from?: string, to?: string) {
    const bookings = await this.bookingRepo.find({
      where: { createdAt: this.dateRange(from, to) as any },
      relations: ['user', 'workspace'],
      order: { createdAt: 'DESC' },
    });
    return bookings.map((b) => ({
      id: b.id,
      member: (b as any).user?.fullName ?? b.userId,
      workspace: (b as any).workspace?.name ?? b.workspaceId,
      startDate: b.startDate,
      endDate: b.endDate,
      status: b.status,
      totalKobo: b.totalAmount,
    }));
  }

  async revenueReport(from?: string, to?: string) {
    const invoices = await this.invoiceRepo.find({
      where: { createdAt: this.dateRange(from, to) as any },
      order: { createdAt: 'DESC' },
    });
    const total = invoices.reduce((s, i) => s + Number(i.amountKobo), 0);
    const paid = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + Number(i.amountKobo), 0);
    return {
      totalKobo: total,
      paidKobo: paid,
      outstandingKobo: total - paid,
      count: invoices.length,
      invoices: invoices.map((i) => ({
        id: i.id,
        userId: i.userId,
        amountKobo: i.amountKobo,
        status: i.status,
        createdAt: i.createdAt,
      })),
    };
  }

  async membersReport(from?: string, to?: string) {
    const users = await this.userRepo.find({ order: { createdAt: 'DESC' } });
    const inRange = users.filter((u) => {
      const t = new Date(u.createdAt).getTime();
      const s = from ? new Date(from).getTime() : Date.now() - 30 * 86400000;
      const e = to ? new Date(to).getTime() : Date.now();
      return t >= s && t <= e;
    });
    return {
      total: users.length,
      newInPeriod: inRange.length,
      members: inRange.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        role: u.role,
        membershipStatus: u.membershipStatus,
        createdAt: u.createdAt,
      })),
    };
  }

  async occupancyReport(from?: string, to?: string) {
    const workspaces = await this.workspaceRepo.find();
    const bookings = await this.bookingRepo.find({
      where: { createdAt: this.dateRange(from, to) as any },
    });
    return workspaces.map((ws) => {
      const wsBookings = bookings.filter((b) => b.workspaceId === ws.id);
      return {
        workspaceId: ws.id,
        name: ws.name,
        type: ws.type,
        capacity: ws.capacity,
        bookingCount: wsBookings.length,
      };
    });
  }

  toCsv(rows: Record<string, any>[]): string {
    if (!rows.length) return '';
    const headers = Object.keys(rows[0]);
    const lines = [
      headers.join(','),
      ...rows.map((r) => headers.map((h) => JSON.stringify(r[h] ?? '')).join(',')),
    ];
    return lines.join('\n');
  }
}
