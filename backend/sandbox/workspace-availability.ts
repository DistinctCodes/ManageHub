import { Controller, Get, Param, Query, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';

class Workspace {
  id: string;
  totalSeats: number;
}

class Booking {
  workspaceId: string;
  date: string; // 'YYYY-MM-DD'
  seatCount: number;
  status: 'confirmed' | 'cancelled';
}

interface DaySlot {
  date: string;
  availableSeats: number;
  totalSeats: number;
}

@Controller('sandbox/workspaces')
export class WorkspaceAvailabilityController {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspaceRepo: Repository<Workspace>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
  ) {}

  /** GET /sandbox/workspaces/:id/availability?from=&to= — publicly accessible */
  @Get(':id/availability')
  async getAvailability(
    @Param('id') id: string,
    @Query('from') from: string,
    @Query('to') to: string,
  ): Promise<DaySlot[]> {
    const workspace = await this.workspaceRepo.findOne({ where: { id } });
    if (!workspace) throw new NotFoundException('Workspace not found');

    const start = new Date(from);
    const end = new Date(to);
    const diffDays = Math.ceil((end.getTime() - start.getTime()) / 86_400_000);
    if (diffDays > 60) throw new BadRequestException('Date range cannot exceed 60 days');

    const bookings = await this.bookingRepo.find({
      where: { workspaceId: id, status: 'confirmed', date: Between(from, to) as any },
    });

    const bookedByDate = bookings.reduce<Record<string, number>>((acc, b) => {
      acc[b.date] = (acc[b.date] ?? 0) + b.seatCount;
      return acc;
    }, {});

    return Array.from({ length: diffDays + 1 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const date = d.toISOString().split('T')[0];
      const booked = bookedByDate[date] ?? 0;
      return { date, availableSeats: Math.max(0, workspace.totalSeats - booked), totalSeats: workspace.totalSeats };
    });
  }
}
