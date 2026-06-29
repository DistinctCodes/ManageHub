import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import { Resource } from './entities/resource.entity';
import { ResourceBooking, ResourceBookingStatus } from './entities/resource-booking.entity';
import { CreateResourceDto } from './dto/create-resource.dto';
import { BookResourceDto } from './dto/book-resource.dto';

@Injectable()
export class ResourcesService {
  constructor(
    @InjectRepository(Resource) private resourceRepo: Repository<Resource>,
    @InjectRepository(ResourceBooking) private bookingRepo: Repository<ResourceBooking>,
  ) {}

  async findAll() {
    return this.resourceRepo.find({ where: { isAvailable: true }, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string) {
    const r = await this.resourceRepo.findOne({ where: { id } });
    if (!r) throw new NotFoundException('Resource not found');
    return r;
  }

  async create(dto: CreateResourceDto) {
    return this.resourceRepo.save(this.resourceRepo.create(dto));
  }

  async update(id: string, dto: Partial<CreateResourceDto>) {
    await this.findOne(id);
    await this.resourceRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.resourceRepo.update(id, { isAvailable: false });
  }

  async checkAvailability(id: string, date?: string) {
    const resource = await this.findOne(id);
    if (!date) return { available: resource.isAvailable, totalQuantity: resource.totalQuantity };

    const start = new Date(date);
    const end = new Date(date);
    end.setHours(23, 59, 59);

    const bookedQty = await this.bookingRepo
      .createQueryBuilder('rb')
      .select('SUM(rb.quantityRequested)', 'total')
      .where('rb.resourceId = :id', { id })
      .andWhere('rb.status IN (:...statuses)', { statuses: [ResourceBookingStatus.CONFIRMED, ResourceBookingStatus.PENDING] })
      .andWhere('rb.startTime <= :end', { end })
      .andWhere('rb.endTime >= :start', { start })
      .getRawOne();

    const booked = Number(bookedQty?.total ?? 0);
    return { available: booked < resource.totalQuantity, availableQuantity: resource.totalQuantity - booked, totalQuantity: resource.totalQuantity };
  }

  async book(resourceId: string, userId: string, dto: BookResourceDto) {
    const resource = await this.findOne(resourceId);
    const qty = dto.quantityRequested ?? 1;

    const availability = await this.checkAvailability(resourceId, dto.startTime);
    if (!availability.available || (availability.availableQuantity ?? 0) < qty) {
      throw new BadRequestException('Resource not available for the requested quantity and time');
    }

    const hours = (new Date(dto.endTime).getTime() - new Date(dto.startTime).getTime()) / (1000 * 60 * 60);
    const totalAmount = Math.round(resource.pricePerHour * hours * qty);

    return this.bookingRepo.save(this.bookingRepo.create({
      resourceId, userId,
      startTime: new Date(dto.startTime),
      endTime: new Date(dto.endTime),
      quantityRequested: qty,
      totalAmount,
      status: ResourceBookingStatus.CONFIRMED,
    }));
  }

  async getMyBookings(userId: string) {
    return this.bookingRepo.find({
      where: { userId },
      relations: ['resource'],
      order: { createdAt: 'DESC' },
    });
  }
}
