import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from './lead.entity';

export type LeadStage = 'NEW' | 'CONTACTED' | 'TOURED' | 'NEGOTIATING' | 'WON' | 'LOST';
export type LeadSource = 'CONTACT_FORM' | 'TOUR' | 'MANUAL';

@Injectable()
export class LeadsService {
  constructor(@InjectRepository(Lead) private readonly repo: Repository<Lead>) {}

  async upsert(email: string, source: LeadSource, name: string): Promise<Lead> {
    const existing = await this.repo.findOne({ where: { email } });
    if (existing) {
      existing.activities = [...(existing.activities ?? []), { source, at: new Date().toISOString() }];
      return this.repo.save(existing);
    }
    return this.repo.save(this.repo.create({ email, name, source, stage: 'NEW', activities: [] }));
  }

  async findAll(stage?: LeadStage): Promise<Lead[]> {
    return stage ? this.repo.find({ where: { stage } }) : this.repo.find();
  }

  async updateStage(id: string, stage: LeadStage): Promise<Lead> {
    const lead = await this.repo.findOneOrFail({ where: { id } });
    lead.stage = stage;
    lead.activities = [...(lead.activities ?? []), { stage, at: new Date().toISOString() }];
    return this.repo.save(lead);
  }

  async markWon(email: string): Promise<void> {
    const lead = await this.repo.findOne({ where: { email } });
    if (lead && lead.stage !== 'WON') {
      lead.stage = 'WON';
      lead.activities = [...(lead.activities ?? []), { stage: 'WON', at: new Date().toISOString(), note: 'registered/subscribed' }];
      await this.repo.save(lead);
    }
  }
}