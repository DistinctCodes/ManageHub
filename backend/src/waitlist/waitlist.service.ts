import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WaitlistEntry } from './entities/waitlist-entry.entity';
import { WaitlistStatus } from './enums/waitlist-status.enum';
import { CreateWaitlistDto } from './dto/create-waitlist.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';

@Injectable()
export class WaitlistService {
  constructor(
    @InjectRepository(WaitlistEntry)
    private readonly waitlistRepository: Repository<WaitlistEntry>,
    private readonly notificationsService: NotificationsService,
  ) {}

  async join(
    workspaceId: string,
    userId: string,
    dto: CreateWaitlistDto,
  ): Promise<WaitlistEntry> {
    const existing = await this.waitlistRepository.findOne({
      where: { workspaceId, userId, status: WaitlistStatus.WAITING },
    });
    if (existing) {
      throw new BadRequestException(
        'You are already on the waitlist for this workspace',
      );
    }

    const count = await this.waitlistRepository.count({
      where: { workspaceId, status: WaitlistStatus.WAITING },
    });

    const entry = this.waitlistRepository.create({
      workspaceId,
      userId,
      planType: dto.planType,
      requestedStartDate: dto.requestedStartDate,
      requestedEndDate: dto.requestedEndDate ?? null,
      position: count + 1,
      status: WaitlistStatus.WAITING,
    });

    return this.waitlistRepository.save(entry);
  }

  async getMyEntries(userId: string): Promise<WaitlistEntry[]> {
    return this.waitlistRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async leave(entryId: string, userId: string): Promise<void> {
    const entry = await this.waitlistRepository.findOne({
      where: { id: entryId },
    });
    if (!entry) {
      throw new NotFoundException('Waitlist entry not found');
    }
    if (entry.userId !== userId) {
      throw new ForbiddenException(
        'You can only remove your own waitlist entries',
      );
    }
    if (
      entry.status !== WaitlistStatus.WAITING &&
      entry.status !== WaitlistStatus.NOTIFIED
    ) {
      throw new BadRequestException(
        'Entry cannot be removed in its current state',
      );
    }
    await this.waitlistRepository.remove(entry);
  }

  async findAll(): Promise<WaitlistEntry[]> {
    return this.waitlistRepository.find({ order: { createdAt: 'DESC' } });
  }

  async notifyNextInQueue(workspaceId: string): Promise<void> {
    const next = await this.waitlistRepository.findOne({
      where: { workspaceId, status: WaitlistStatus.WAITING },
      order: { position: 'ASC' },
    });
    if (!next) return;

    const notifiedAt = new Date();
    const expiresAt = new Date(notifiedAt.getTime() + 24 * 60 * 60 * 1000);

    next.status = WaitlistStatus.NOTIFIED;
    next.notifiedAt = notifiedAt;
    next.expiresAt = expiresAt;
    await this.waitlistRepository.save(next);

    await this.notificationsService.create({
      userId: next.userId,
      type: NotificationType.GENERAL,
      title: 'Workspace Available',
      message:
        'A workspace you are waiting for has become available. You have 24 hours to make a booking.',
      metadata: {
        workspaceId,
        waitlistEntryId: next.id,
        expiresAt: expiresAt.toISOString(),
      },
    });
  }
}