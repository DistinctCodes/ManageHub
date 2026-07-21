import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MembershipPlan } from './entities/membership-plan.entity';
import { UserMembership } from './entities/user-membership.entity';
import { MembershipStatus } from './enums/membership-status.enum';
import { CreateMembershipPlanDto } from './dto/create-membership-plan.dto';
import { UpdateMembershipPlanDto } from './dto/update-membership-plan.dto';
import { EmailService } from '../email/email.service';
import { addMonths, addQuarters, addYears, format } from 'date-fns';
import { BillingCycle } from './enums/billing-cycle.enum';

@Injectable()
export class MembershipPlansService {
  constructor(
    @InjectRepository(MembershipPlan)
    private readonly plansRepository: Repository<MembershipPlan>,

    @InjectRepository(UserMembership)
    private readonly membershipsRepository: Repository<UserMembership>,

    private readonly emailService: EmailService,
  ) {}

  // ── Plan CRUD ─────────────────────────────────────────────────────────────

  async findAllActive(): Promise<MembershipPlan[]> {
    return this.plansRepository.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC' },
    });
  }

  async findById(id: string): Promise<MembershipPlan> {
    const plan = await this.plansRepository.findOne({ where: { id } });
    if (!plan) throw new NotFoundException(`Membership plan ${id} not found`);
    return plan;
  }

  async create(dto: CreateMembershipPlanDto): Promise<MembershipPlan> {
    const plan = this.plansRepository.create(dto);
    return this.plansRepository.save(plan);
  }

  async update(id: string, dto: UpdateMembershipPlanDto): Promise<MembershipPlan> {
    const plan = await this.findById(id);

    // Cannot change priceKobo if plan has active subscribers
    if (dto.priceKobo !== undefined && dto.priceKobo !== plan.priceKobo) {
      const activeCount = await this.membershipsRepository.count({
        where: { planId: id, status: MembershipStatus.ACTIVE },
      });
      if (activeCount > 0) {
        throw new BadRequestException(
          'Cannot change priceKobo while the plan has active subscribers',
        );
      }
    }

    Object.assign(plan, dto);
    return this.plansRepository.save(plan);
  }

  // ── Subscriptions ─────────────────────────────────────────────────────────

  async subscribe(userId: string, planId: string): Promise<UserMembership> {
    const plan = await this.findById(planId);

    if (!plan.isActive) {
      throw new BadRequestException('This plan is not currently available');
    }

    // Cancel any existing active subscription first
    const existing = await this.membershipsRepository.findOne({
      where: { userId, status: MembershipStatus.ACTIVE },
    });
    if (existing) {
      existing.status = MembershipStatus.CANCELLED;
      existing.cancelledAt = new Date();
      await this.membershipsRepository.save(existing);
    }

    const today = new Date();
    const periodEnd = this.calculatePeriodEnd(today, plan.billingCycle);

    const membership = this.membershipsRepository.create({
      userId,
      planId,
      status: MembershipStatus.ACTIVE,
      startDate: format(today, 'yyyy-MM-dd'),
      currentPeriodEnd: format(periodEnd, 'yyyy-MM-dd'),
    });

    const saved = await this.membershipsRepository.save(membership);

    // Send welcome email (best-effort)
    try {
      await this.emailService.sendTemplateEmail(
        userId, // caller resolves to email outside this service
        `Welcome to ${plan.name}`,
        'booking-created', // reuse closest template
        { planName: plan.name, billingCycle: plan.billingCycle },
      );
    } catch {
      // non-blocking
    }

    return saved;
  }

  async cancelMySubscription(userId: string): Promise<UserMembership> {
    const membership = await this.membershipsRepository.findOne({
      where: { userId, status: MembershipStatus.ACTIVE },
      relations: ['plan'],
    });
    if (!membership) {
      throw new NotFoundException('No active subscription found');
    }

    membership.status = MembershipStatus.CANCELLED;
    membership.cancelledAt = new Date();
    const saved = await this.membershipsRepository.save(membership);

    try {
      await this.emailService.sendTemplateEmail(
        userId,
        'Subscription cancelled',
        'booking-cancelled',
        {
          planName: membership.plan?.name ?? '',
          currentPeriodEnd: membership.currentPeriodEnd,
        },
      );
    } catch {
      // non-blocking
    }

    return saved;
  }

  async getMySubscription(userId: string): Promise<UserMembership> {
    const membership = await this.membershipsRepository.findOne({
      where: { userId, status: MembershipStatus.ACTIVE },
      relations: ['plan'],
    });
    if (!membership) {
      throw new NotFoundException('No active subscription found');
    }
    return membership;
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private calculatePeriodEnd(from: Date, cycle: BillingCycle): Date {
    switch (cycle) {
      case BillingCycle.MONTHLY:   return addMonths(from, 1);
      case BillingCycle.QUARTERLY: return addQuarters(from, 1);
      case BillingCycle.YEARLY:    return addYears(from, 1);
    }
  }
}