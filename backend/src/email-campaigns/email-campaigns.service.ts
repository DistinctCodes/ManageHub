import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailCampaign } from './entities/email-campaign.entity';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { CampaignStatus } from './enums/campaign-status.enum';

@Injectable()
export class EmailCampaignsService {
  constructor(
    @InjectRepository(EmailCampaign)
    private readonly repo: Repository<EmailCampaign>,
  ) {}

  async create(dto: CreateCampaignDto, adminId: string): Promise<EmailCampaign> {
    return this.repo.save(this.repo.create({
      ...dto,
      scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : null,
      createdByAdminId: adminId,
    }));
  }

  async findAll(status?: CampaignStatus) {
    const where = status ? { status } : {};
    return this.repo.find({ where, order: { createdAt: 'DESC' } });
  }

  async findOne(id: string): Promise<EmailCampaign> {
    const item = await this.repo.findOne({ where: { id }, relations: ['createdByAdmin'] });
    if (!item) throw new NotFoundException(`Campaign ${id} not found`);
    return item;
  }

  async update(id: string, dto: Partial<CreateCampaignDto>): Promise<EmailCampaign> {
    const item = await this.findOne(id);
    if (item.status !== CampaignStatus.DRAFT) throw new BadRequestException('Only draft campaigns can be edited');
    Object.assign(item, dto);
    return this.repo.save(item);
  }

  async send(id: string): Promise<EmailCampaign> {
    const item = await this.findOne(id);
    item.status = CampaignStatus.SENDING;
    const saved = await this.repo.save(item);
    // In a real implementation this would enqueue a Bull job
    saved.status = CampaignStatus.SENT;
    saved.sentAt = new Date();
    return this.repo.save(saved);
  }
}
