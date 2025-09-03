import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Resource } from './entities/resource.entity';
import { Booking } from './entities/booking.entity';
import { CreateResourceDto } from './dto/create-resource.dto';
import { CreateBookingDto } from './dto/create-booking.dto';

@Injectable()
export class ResourceBookingService {
  constructor(
    @InjectRepository(Resource)
    private readonly resourceRepo: Repository<Resource>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
  ) {}

  async createResource(dto: CreateResourceDto) {
    const resource = this.resourceRepo.create(dto);
    return this.resourceRepo.save(resource);
  }

  async listResources() {
    return this.resourceRepo.find();
  }

  async createBooking(dto: CreateBookingDto) {
    // Check resource exists
    const resource = await this.resourceRepo.findOne({ where: { id: dto.resourceId } });
    if (!resource) throw new NotFoundException('Resource not found');
    // Check for overlapping bookings
    const overlap = await this.bookingRepo.findOne({
      where: {
        resourceId: dto.resourceId,
        startTime: Between(dto.startTime, dto.endTime),
      },
    });
    if (overlap) throw new BadRequestException('Resource already booked for this time');
    const booking = this.bookingRepo.create({ ...dto, startTime: new Date(dto.startTime), endTime: new Date(dto.endTime) });
    return this.bookingRepo.save(booking);
  }

  async listBookings(resourceId?: string) {
    if (resourceId) {
      return this.bookingRepo.find({ where: { resourceId }, relations: ['resource'] });
    }
    return this.bookingRepo.find({ relations: ['resource'] });
  }
}
