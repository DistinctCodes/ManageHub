import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MembershipPlan } from './entities/membership-plan.entity';
import { UserMembership } from './entities/user-membership.entity';
import { CreateMembershipPlanDto } from './dto/create-membership-plan.dto';
import { UpdateMembershipPlanDto } from './dto/update-membership-plan.dto';
import { BillingCycle } from './enums/billing-cycle.enum';
import { SubscriptionStatus } from './enums/subscription-status.enum';

@Injectable()
export class MembershipPlansService {
  constructor(
    @InjectRepository(MembershipPlan)
    private readonly plansRepository: Repository<MembershipPlan>,
    @InjectRepository(UserMembership)
    private readonly membershipsRepository: Repository<UserMembership>,
  ) {}

  async create(dto: CreateMembershipPlanDto): Promise<MembershipPlan> {
    const plan = this.plansRepository.create({
      ...dto,
      features: dto.features ?? {},
    });
    return this.plansRepository.save(plan);
  }

  async findAll(): Promise<MembershipPlan[]> {
    return this.plansRepository.find({
      where: { isActive: true },
      order: { price: 'ASC' },
    });
  }

  async findById(id: string): Promise<MembershipPlan> {
    const plan = await this.plansRepository.findOne({ where: { id } });
    if (!plan) {
      throw new NotFoundException(`Membership plan "${id}" not found`);
    }
    return plan;
  }

  async update(
    id: string,
    dto: UpdateMembershipPlanDto,
  ): Promise<MembershipPlan> {
    const plan = await this.findById(id);
    Object.assign(plan, dto);
    return this.plansRepository.save(plan);
  }

  async remove(id: string): Promise<void> {
    const plan = await this.findById(id);
    plan.isActive = false;
    await this.plansRepository.save(plan);
  }

  async subscribe(planId: string, userId: string): Promise<UserMembership> {
    const plan = await this.findById(planId);
    if (!plan.isActive) {
      throw new BadRequestException('Plan is not active');
    }
    const existing = await this.membershipsRepository.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
    });
    if (existing) {
      existing.status = SubscriptionStatus.CANCELLED;
      existing.autoRenew = false;
      await this.membershipsRepository.save(existing);
    }
    const now = new Date();
    const membership = this.membershipsRepository.create({
      userId,
      planId,
      startDate: now,
      endDate: this.computeEndDate(now, plan.billingCycle),
      status: SubscriptionStatus.ACTIVE,
      autoRenew: true,
    });
    return this.membershipsRepository.save(membership);
  }

  async getMySubscription(userId: string): Promise<UserMembership | null> {
    return this.membershipsRepository.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
      relations: ['plan'],
    });
  }

  async cancelSubscription(userId: string): Promise<void> {
    const membership = await this.membershipsRepository.findOne({
      where: { userId, status: SubscriptionStatus.ACTIVE },
    });
    if (!membership) {
      throw new NotFoundException('No active membership found');
    }
    membership.status = SubscriptionStatus.CANCELLED;
    membership.autoRenew = false;
    await this.membershipsRepository.save(membership);
  }

  private computeEndDate(start: Date, cycle: BillingCycle): Date {
    const end = new Date(start);
    switch (cycle) {
      case BillingCycle.MONTHLY:
        end.setMonth(end.getMonth() + 1);
        break;
      case BillingCycle.QUARTERLY:
        end.setMonth(end.getMonth() + 3);
        break;
      case BillingCycle.YEARLY:
        end.setFullYear(end.getFullYear() + 1);
        break;
    }
    return end;
  }
}