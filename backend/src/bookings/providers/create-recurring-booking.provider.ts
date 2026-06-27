import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Booking } from '../entities/booking.entity';
import { RecurringRule, RecurringFrequency } from '../entities/recurring-rule.entity';
import { CreateRecurringBookingDto } from '../dto/create-recurring-booking.dto';
import { BookingStatus } from '../enums/booking-status.enum';
import { PricingService } from '../pricing/pricing.service';
import { Workspace } from '../../workspaces/entities/workspace.entity';

const MAX_INSTANCES = 52;

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toDateStr(date: Date): string {
  return date.toISOString().split('T')[0];
}

function generateOccurrences(
  baseStart: Date,
  baseEnd: Date,
  rule: CreateRecurringBookingDto['recurringRule'],
): Array<{ startDate: string; endDate: string }> {
  const duration = baseEnd.getTime() - baseStart.getTime();
  const occurrences: Array<{ startDate: string; endDate: string }> = [];
  const cutoff = rule.endDate ? new Date(rule.endDate) : null;
  const max = Math.min(rule.maxOccurrences ?? MAX_INSTANCES, MAX_INSTANCES);

  let cursor = new Date(baseStart);

  while (occurrences.length < max) {
    if (cutoff && cursor > cutoff) break;

    if (rule.frequency === RecurringFrequency.WEEKLY && rule.daysOfWeek?.length) {
      if (rule.daysOfWeek.includes(cursor.getDay())) {
        const end = new Date(cursor.getTime() + duration);
        occurrences.push({ startDate: toDateStr(cursor), endDate: toDateStr(end) });
      }
      cursor = addDays(cursor, 1);
    } else {
      const end = new Date(cursor.getTime() + duration);
      occurrences.push({ startDate: toDateStr(cursor), endDate: toDateStr(end) });

      if (rule.frequency === RecurringFrequency.DAILY) {
        cursor = addDays(cursor, rule.interval);
      } else if (rule.frequency === RecurringFrequency.WEEKLY) {
        cursor = addDays(cursor, rule.interval * 7);
      } else {
        cursor = new Date(cursor);
        cursor.setMonth(cursor.getMonth() + rule.interval);
      }
    }

    // Safety: weekly day-walk should stop after 2 years
    if (
      rule.frequency === RecurringFrequency.WEEKLY &&
      rule.daysOfWeek?.length &&
      cursor > addDays(baseStart, 730)
    ) break;
  }

  return occurrences;
}

@Injectable()
export class CreateRecurringBookingProvider {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingsRepo: Repository<Booking>,
    @InjectRepository(RecurringRule)
    private readonly rulesRepo: Repository<RecurringRule>,
    private readonly pricingService: PricingService,
    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreateRecurringBookingDto, userId: string) {
    const { recurringRule, ...bookingBase } = dto;

    if (!recurringRule.endDate && !recurringRule.maxOccurrences) {
      throw new BadRequestException('Provide endDate or maxOccurrences for the recurring rule');
    }

    const baseStart = new Date(bookingBase.startDate);
    const baseEnd = new Date(bookingBase.endDate);

    if (baseEnd <= baseStart) {
      throw new BadRequestException('endDate must be after startDate');
    }

    const occurrences = generateOccurrences(baseStart, baseEnd, recurringRule);
    if (!occurrences.length) {
      throw new BadRequestException('No valid occurrences generated from the given rule');
    }

    return this.dataSource.transaction(async (manager) => {
      const workspace = await manager
        .createQueryBuilder(Workspace, 'w')
        .setLock('pessimistic_write')
        .where('w.id = :id', { id: bookingBase.workspaceId })
        .getOne();

      if (!workspace) throw new NotFoundException(`Workspace "${bookingBase.workspaceId}" not found`);
      if (!workspace.isActive) throw new BadRequestException('Workspace is not active');

      const recurringGroupId = uuidv4();
      const saved: Booking[] = [];
      const skipped: string[] = [];

      for (const occ of occurrences) {
        const overlap = await manager
          .createQueryBuilder(Booking, 'b')
          .select('COALESCE(SUM(b.seatCount), 0)', 'booked')
          .where('b.workspaceId = :workspaceId', { workspaceId: bookingBase.workspaceId })
          .andWhere('b.status IN (:...statuses)', { statuses: [BookingStatus.PENDING, BookingStatus.CONFIRMED] })
          .andWhere('b.startDate <= :endDate', { endDate: occ.endDate })
          .andWhere('b.endDate >= :startDate', { startDate: occ.startDate })
          .getRawOne<{ booked: string }>();

        const alreadyBooked = Number(overlap?.booked ?? 0);
        if (alreadyBooked + bookingBase.seatCount > workspace.totalSeats) {
          skipped.push(occ.startDate);
          continue;
        }

        const totalAmount = this.pricingService.calculateAmount(
          Number(workspace.hourlyRate),
          bookingBase.planType,
          bookingBase.seatCount,
          occ.startDate,
          occ.endDate,
        );

        const booking = manager.create(Booking, {
          ...bookingBase,
          userId,
          startDate: occ.startDate,
          endDate: occ.endDate,
          totalAmount,
          status: BookingStatus.PENDING,
          isRecurring: true,
          recurringGroupId,
        });

        saved.push(await manager.save(booking));
      }

      if (!saved.length) {
        throw new ConflictException('No seats available for any of the requested recurring dates');
      }

      const rule = manager.create(RecurringRule, {
        ...recurringRule,
        parentBookingId: saved[0].id,
      });
      await manager.save(rule);

      return { recurringGroupId, created: saved.length, skipped, bookings: saved };
    });
  }
}
