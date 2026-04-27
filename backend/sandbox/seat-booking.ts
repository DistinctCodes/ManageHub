import {
  Controller, Post, Get, Body, Param, Query,
  BadRequestException, ConflictException, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class SeatBooking {
  @PrimaryGeneratedColumn('uuid') id: string;
  @Column() workspaceId: string;
  @Column() seatNumber: number;
  @Column() bookingId: string;
  @Column({ type: 'date' }) date: string;
}

// Minimal workspace shape expected from DB
interface Workspace { id: string; totalSeats: number; }

@Controller('sandbox')
export class SeatBookingController {
  constructor(
    @InjectRepository(SeatBooking)
    private readonly seatRepo: Repository<SeatBooking>,
    @InjectRepository('Workspace')
    private readonly wsRepo: Repository<Workspace>,
  ) {}

  @Post('seat-bookings')
  async book(@Body() dto: { workspaceId: string; seatNumber: number; bookingId: string; date: string }) {
    const ws = await this.wsRepo.findOne({ where: { id: dto.workspaceId } });
    if (!ws) throw new NotFoundException('Workspace not found');
    if (dto.seatNumber < 1 || dto.seatNumber > ws.totalSeats)
      throw new BadRequestException(`Seat must be between 1 and ${ws.totalSeats}`);

    const taken = await this.seatRepo.findOne({
      where: { workspaceId: dto.workspaceId, seatNumber: dto.seatNumber, date: dto.date },
    });
    if (taken) throw new ConflictException('Seat already booked for this date');

    return this.seatRepo.save(this.seatRepo.create(dto));
  }

  @Get('workspaces/:id/seats')
  async availability(@Param('id') workspaceId: string, @Query('date') date: string) {
    if (!date) throw new BadRequestException('date query param required');
    const ws = await this.wsRepo.findOne({ where: { id: workspaceId } });
    if (!ws) throw new NotFoundException('Workspace not found');

    const booked = await this.seatRepo.find({ where: { workspaceId, date } });
    const bookedNums = new Set(booked.map((b) => b.seatNumber));

    return Array.from({ length: ws.totalSeats }, (_, i) => ({
      seatNumber: i + 1,
      available: !bookedNums.has(i + 1),
    }));
  }
}
