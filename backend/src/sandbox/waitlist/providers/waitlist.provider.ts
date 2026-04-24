import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WaitlistEntry } from '../entities/waitlist-entry.entity';
import { JoinWaitlistDto } from '../dto/join-waitlist.dto';
import { EmailService } from '../../../email/email.service';
import { User } from '../../../users/entities/user.entity';
import { Workspace } from '../../../workspaces/entities/workspace.entity';

@Injectable()
export class WaitlistProvider {
  constructor(
    @InjectRepository(WaitlistEntry)
    private readonly waitlistRepo: Repository<WaitlistEntry>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Workspace)
    private readonly workspacesRepo: Repository<Workspace>,
    private readonly emailService: EmailService,
  ) {}

  async join(dto: JoinWaitlistDto, userId: string): Promise<WaitlistEntry> {
    const workspace = await this.workspacesRepo.findOne({
      where: { id: dto.workspaceId },
    });
    if (!workspace) {
      throw new NotFoundException(`Workspace "${dto.workspaceId}" not found`);
    }

    const existing = await this.waitlistRepo.findOne({
      where: {
        userId,
        workspaceId: dto.workspaceId,
        requestedDate: dto.requestedDate,
      },
    });
    if (existing) {
      throw new BadRequestException(
        'You are already on the waitlist for this workspace and date',
      );
    }

    const entry = this.waitlistRepo.create({
      userId,
      workspaceId: dto.workspaceId,
      requestedDate: dto.requestedDate,
    });
    return this.waitlistRepo.save(entry);
  }

  async remove(entryId: string, userId: string): Promise<void> {
    const entry = await this.waitlistRepo.findOne({ where: { id: entryId } });
    if (!entry) {
      throw new NotFoundException(`Waitlist entry "${entryId}" not found`);
    }
    if (entry.userId !== userId) {
      throw new BadRequestException(
        'You can only remove your own waitlist entries',
      );
    }
    await this.waitlistRepo.remove(entry);
  }

  async getMyEntries(userId: string): Promise<WaitlistEntry[]> {
    return this.waitlistRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getByWorkspace(workspaceId: string): Promise<WaitlistEntry[]> {
    return this.waitlistRepo.find({
      where: { workspaceId },
      order: { createdAt: 'ASC' },
    });
  }

  async notifyFirstInQueue(
    workspaceId: string,
    requestedDate: string,
  ): Promise<void> {
    const entry = await this.waitlistRepo.findOne({
      where: { workspaceId, requestedDate, notified: false },
      order: { createdAt: 'ASC' },
    });
    if (!entry) return;

    const [user, workspace] = await Promise.all([
      this.usersRepo.findOne({ where: { id: entry.userId } }),
      this.workspacesRepo.findOne({ where: { id: workspaceId } }),
    ]);
    if (!user || !workspace) return;

    entry.notified = true;
    await this.waitlistRepo.save(entry);

    this.emailService
      .sendTemplateEmail(
        user.email,
        `A spot opened up at ${workspace.name} — ManageHub`,
        'booking-created',
        {
          fullName: `${user.firstname} ${user.lastname}`.trim(),
          workspaceName: workspace.name,
          requestedDate: entry.requestedDate,
          message: 'A booking was cancelled and a spot is now available.',
        },
      )
      .catch(() => void 0);
  }
}
