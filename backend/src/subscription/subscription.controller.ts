import { Controller, Post, Get, Body, Param, HttpStatus, HttpCode } from "@nestjs/common"
import type { SubscriptionService } from "./subscription.service"
import type { CreateSubscriptionPlanDto } from "./dto/create-subscription-plan.dto"
import type { SubscribeDto } from "./dto/subscribe.dto"
import type { SubscriptionPlan } from "./entities/subscription-plan.entity"
import type { UserSubscription } from "./entities/user-subscription.entity"

@Controller("subscription")
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Post('plans')
  @HttpCode(HttpStatus.CREATED)
  createPlan(@Body() createPlanDto: CreateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    return this.subscriptionService.createPlan(createPlanDto);
  }

  @Get("plans")
  @HttpCode(HttpStatus.OK)
  getAllActivePlans(): Promise<SubscriptionPlan[]> {
    return this.subscriptionService.getAllActivePlans()
  }

  @Post('subscribe')
  @HttpCode(HttpStatus.CREATED)
  subscribe(@Body() subscribeDto: SubscribeDto): Promise<UserSubscription> {
    return this.subscriptionService.subscribe(subscribeDto);
  }

  @Get('status/:userId')
  @HttpCode(HttpStatus.OK)
  getUserSubscriptionStatus(@Param('userId') userId: string) {
    return this.subscriptionService.getUserSubscriptionStatus(userId);
  }
}
