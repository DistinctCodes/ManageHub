import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ParkingSlot } from './entities/parking-slot.entity';
import { ParkingBooking } from './entities/parking-booking.entity';
import { CreateSlotDto } from './dto/create-slot.dto';
import { ReserveSlotDto } from './dto/reserve-slot.dto';
import { ReleaseSlotDto } from './dto/release-slot.dto';

@Injectable()
export class ParkingService {
  constructor(
    @InjectRepository(ParkingSlot, 'parking')
    private readonly slotRepo: Repository<ParkingSlot>,
    @InjectRepository(ParkingBooking, 'parking')
    private readonly bookingRepo: Repository<ParkingBooking>,
  ) {}

  async createSlot(dto: CreateSlotDto): Promise<ParkingSlot> {
    const exists = await this.slotRepo.findOne({ where: { name: dto.name } });
    if (exists) throw new BadRequestException('Slot name already exists');
    const slot = this.slotRepo.create({ name: dto.name, location: dto.location ?? null, isReserved: false });
    return this.slotRepo.save(slot);
  }

  async listSlots(): Promise<ParkingSlot[]> {
    return this.slotRepo.find({ order: { name: 'ASC' } });
  }

  async reserve(dto: ReserveSlotDto): Promise<ParkingBooking> {
    const slot = await this.slotRepo.findOne({ where: { id: dto.slotId } });
    if (!slot) throw new NotFoundException('Slot not found');
    if (slot.isReserved) throw new BadRequestException('Slot already reserved');

    slot.isReserved = true;
    await this.slotRepo.save(slot);

    const booking = this.bookingRepo.create({ slotId: slot.id, staffId: dto.staffId, releasedAt: null });
    return this.bookingRepo.save(booking);
  }

  async release(dto: ReleaseSlotDto): Promise<ParkingBooking> {
    const slot = await this.slotRepo.findOne({ where: { id: dto.slotId } });
    if (!slot) throw new NotFoundException('Slot not found');
    if (!slot.isReserved) throw new BadRequestException('Slot is not currently reserved');

    // Find latest active booking for this slot
    const active = await this.bookingRepo.findOne({
      where: { slotId: slot.id, releasedAt: null },
      order: { reservedAt: 'DESC' },
    });
    if (!active) throw new NotFoundException('Active booking not found for this slot');

    active.releasedAt = new Date();
    await this.bookingRepo.save(active);

    slot.isReserved = false;
    await this.slotRepo.save(slot);

    return active;
  }

  async listBookings(params?: { slotId?: string; staffId?: string }): Promise<ParkingBooking[]> {
    const where: any = {};
    if (params?.slotId) where.slotId = params.slotId;
    if (params?.staffId) where.staffId = params.staffId;
    return this.bookingRepo.find({ where, order: { reservedAt: 'DESC' } });
  }
}
