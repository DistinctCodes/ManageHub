import { Injectable, NotFoundException, ConflictException } from "@nestjs/common"
import { InjectRepository } from "@nestjs/typeorm"
import { type Repository, LessThan, MoreThan } from "typeorm"
import { SubscriptionPlan } from "./entities/subscription-plan.entity"
import { UserSubscription } from "./entities/user-subscription.entity"
import type { CreateSubscriptionPlanDto } from "./dto/create-subscription-plan.dto"
import type { SubscribeDto } from "./dto/subscribe.dto"

@Injectable()
export class SubscriptionService {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private subscriptionPlanRepository: Repository<SubscriptionPlan>,
    @InjectRepository(UserSubscription)
    private userSubscriptionRepository: Repository<UserSubscription>,
  ) { }

  async createPlan(createPlanDto: CreateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    const plan = this.subscriptionPlanRepository.create(createPlanDto)
    return this.subscriptionPlanRepository.save(plan)
  }

  async getAllActivePlans(): Promise<SubscriptionPlan[]> {
    return this.subscriptionPlanRepository.find({
      where: { isActive: true },
    })
  }

  async subscribe(subscribeDto: SubscribeDto): Promise<UserSubscription> {
    const { userId, planId } = subscribeDto

    // Check if plan exists
    const plan = await this.subscriptionPlanRepository.findOne({
      where: { id: planId, isActive: true },
    })

    if (!plan) {
      throw new NotFoundException("Subscription plan not found or inactive")
    }

    // Check if user already has an active subscription
    const activeSubscription = await this.userSubscriptionRepository.findOne({
      where: {
        userId,
        isActive: true,
        endDate: MoreThan(new Date()),
      },
    })

    if (activeSubscription) {
      throw new ConflictException("User already has an active subscription")
    }

    // Calculate end date based on plan duration
    const startDate = new Date()
    const endDate = new Date()
    endDate.setDate(endDate.getDate() + plan.duration)

    // Create new subscription
    const subscription = this.userSubscriptionRepository.create({
      userId,
      planId,
      startDate,
      endDate,
      isActive: true,
    })

    return this.userSubscriptionRepository.save(subscription)
  }

  async getUserSubscriptionStatus(
    userId: string,
  ): Promise<{ hasActiveSubscription: boolean; subscription?: UserSubscription }> {
    const subscription = await this.userSubscriptionRepository.findOne({
      where: {
        userId,
        isActive: true,
        endDate: MoreThan(new Date()),
      },
      relations: ["plan"],
    })

    return {
      hasActiveSubscription: !!subscription,
      subscription,
    }
  }

  async expireSubscriptions(): Promise<void> {
    const now = new Date()

    await this.userSubscriptionRepository.update(
      {
        endDate: LessThan(now),
        isActive: true,
      },
      {
        isActive: false,
      },
    )
  }
}
