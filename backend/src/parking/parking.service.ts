import {
  Injectable, NotFoundException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { ParkingSpot } from './entities/parking-spot.entity';
import { CreateParkingSpotDto } from './dto/create-parking-spot.dto';
import { UpdateParkingSpotDto } from './dto/update-parking-spot.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';

@Injectable()
export class ParkingService {
  constructor(
    @InjectRepository(ParkingSpot)
    private readonly parkingRepo: Repository<ParkingSpot>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /** Admin: all active spots with assignee. Member: only their own spot. */
  async findAll(requestingUserId: string, isAdmin: boolean): Promise<ParkingSpot[]> {
    if (isAdmin) {
      return this.parkingRepo.find({
        where: { isActive: true },
        relations: ['assignedTo'],
        order: { spotNumber: 'ASC' },
      });
    }
    return this.parkingRepo.find({
      where: { assignedToUserId: requestingUserId, isActive: true },
      order: { spotNumber: 'ASC' },
    });
  }

  async findMine(userId: string): Promise<ParkingSpot | null> {
    return this.parkingRepo.findOne({
      where: { assignedToUserId: userId, isActive: true },
    });
  }

  async findOne(id: string): Promise<ParkingSpot> {
    const spot = await this.parkingRepo.findOne({ where: { id }, relations: ['assignedTo'] });
    if (!spot) throw new NotFoundException(`Parking spot ${id} not found`);
    return spot;
  }

  async create(dto: CreateParkingSpotDto): Promise<ParkingSpot> {
    const existing = await this.parkingRepo.findOne({ where: { spotNumber: dto.spotNumber } });
    if (existing) throw new BadRequestException(`Spot number ${dto.spotNumber} already exists`);
    const spot = this.parkingRepo.create(dto);
    return this.parkingRepo.save(spot);
  }

  async update(id: string, dto: UpdateParkingSpotDto): Promise<ParkingSpot> {
    const spot = await this.findOne(id);
    Object.assign(spot, dto);
    return this.parkingRepo.save(spot);
  }

  async assign(id: string, userId: string): Promise<ParkingSpot> {
    const spot = await this.findOne(id);
    if (spot.assignedToUserId) {
      throw new BadRequestException(
        `Spot ${spot.spotNumber} is already assigned to another member`,
      );
    }
    spot.assignedToUserId = userId;
    spot.assignedAt = new Date();
    const saved = await this.parkingRepo.save(spot);

    await this.notificationsService.create({
      userId,
      type: NotificationType.GENERAL,
      title: 'Parking spot assigned',
      message: `Parking spot ${spot.spotNumber} has been assigned to you.`,
      metadata: { spotId: spot.id, spotNumber: spot.spotNumber },
    });

    return saved;
  }

  async unassign(id: string): Promise<ParkingSpot> {
    const spot = await this.findOne(id);
    const previousUserId = spot.assignedToUserId;

    spot.assignedToUserId = null;
    spot.assignedAt = null;
    const saved = await this.parkingRepo.save(spot);

    if (previousUserId) {
      await this.notificationsService.create({
        userId: previousUserId,
        type: NotificationType.GENERAL,
        title: 'Parking spot unassigned',
        message: `Parking spot ${spot.spotNumber} has been unassigned from your account.`,
        metadata: { spotId: spot.id, spotNumber: spot.spotNumber },
      });
    }

    return saved;
  }
}