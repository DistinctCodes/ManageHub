import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { AccessDevice } from './entities/access-device.entity';
import { AccessLog } from './entities/access-log.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { CreateDeviceDto } from './dto/create-device.dto';
import { WebhookDto } from './dto/webhook.dto';
import { LogQueryDto } from './dto/log-query.dto';
import { UpdateDeviceStatusDto } from './dto/update-device-status.dto';
import { GrantAccessDto } from './dto/grant-access.dto';
import { AccessAction } from './enums/access-action.enum';
import { AccessMethod } from './enums/access-method.enum';
import { DeviceStatus } from './enums/device-status.enum';
import { BookingStatus } from '../bookings/enums/booking-status.enum';

@Injectable()
export class AccessControlService {
  constructor(
    @InjectRepository(AccessDevice)
    private readonly deviceRepo: Repository<AccessDevice>,
    @InjectRepository(AccessLog)
    private readonly logRepo: Repository<AccessLog>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    private readonly jwtService: JwtService,
  ) {}

  async handleWebhook(dto: WebhookDto): Promise<{ access: 'granted' | 'denied' }> {
    const device = await this.deviceRepo.findOne({
      where: { deviceIdentifier: dto.deviceIdentifier },
    });

    if (!device) {
      return { access: 'denied' };
    }

    // Update device last seen and status
    await this.deviceRepo.update(device.id, {
      lastSeenAt: new Date(),
      status: DeviceStatus.ONLINE,
    });

    let userId: string | null = null;
    let denyReason: string | null = null;

    try {
      const payload = this.jwtService.verify<{ sub: string }>(dto.memberToken);
      userId = payload.sub;
    } catch {
      denyReason = 'Invalid or expired token';
      await this.logRepo.save(
        this.logRepo.create({
          deviceId: device.id,
          userId: null,
          action: AccessAction.DENIED,
          denyReason,
          method: AccessMethod.QR,
        }),
      );
      return { access: 'denied' };
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];

    const activeBooking = await this.bookingRepo
      .createQueryBuilder('booking')
      .where('booking.userId = :userId', { userId })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: [BookingStatus.CONFIRMED, BookingStatus.PENDING],
      })
      .andWhere('booking.startDate <= :today', { today })
      .andWhere('booking.endDate >= :today', { today })
      .getOne();

    const action = activeBooking ? AccessAction.GRANTED : AccessAction.DENIED;
    if (!activeBooking) {
      denyReason = 'No active booking for current time slot';
    }

    await this.logRepo.save(
      this.logRepo.create({
        deviceId: device.id,
        userId,
        action,
        denyReason,
        method: AccessMethod.QR,
      }),
    );

    return { access: action === AccessAction.GRANTED ? 'granted' : 'denied' };
  }

  async createDevice(dto: CreateDeviceDto): Promise<AccessDevice> {
    const device = this.deviceRepo.create(dto);
    return this.deviceRepo.save(device);
  }

  async findAllDevices(): Promise<AccessDevice[]> {
    return this.deviceRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findLogs(query: LogQueryDto) {
    const { deviceId, userId, from, to, action, page = 1, perPage = 10 } = query;

    const qb = this.logRepo
      .createQueryBuilder('log')
      .orderBy('log.timestamp', 'DESC')
      .skip((page - 1) * perPage)
      .take(perPage);

    if (deviceId) qb.andWhere('log.deviceId = :deviceId', { deviceId });
    if (userId) qb.andWhere('log.userId = :userId', { userId });
    if (action) qb.andWhere('log.action = :action', { action });
    if (from) qb.andWhere('log.timestamp >= :from', { from });
    if (to) qb.andWhere('log.timestamp <= :to', { to });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, perPage };
  }

  async grantAccess(userId: string, dto: GrantAccessDto) {
    const device = await this.deviceRepo.findOne({
      where: { deviceIdentifier: dto.deviceIdentifier },
    });

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    await this.logRepo.save(
      this.logRepo.create({
        deviceId: device.id,
        userId,
        action: AccessAction.GRANTED,
        denyReason: null,
        method: AccessMethod.MANUAL,
      }),
    );

    return { access: 'granted' as const };
  }

  async updateDeviceStatus(id: string, dto: UpdateDeviceStatusDto): Promise<AccessDevice> {
    const device = await this.deviceRepo.findOne({ where: { id } });
    if (!device) throw new NotFoundException('Device not found');

    device.status = dto.status;
    if (dto.status === DeviceStatus.ONLINE) {
      device.lastSeenAt = new Date();
    }
    return this.deviceRepo.save(device);
  }
}
