import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { ScheduleModule } from "@nestjs/schedule"
import { SubscriptionController } from "./subscription.controller"
import { SubscriptionService } from "./subscription.service"
import { SubscriptionPlan } from "./entities/subscription-plan.entity"
import { UserSubscription } from "./entities/user-subscription.entity"
import { SubscriptionScheduler } from "./subscription.scheduler"

@Module({
  imports: [TypeOrmModule.forFeature([SubscriptionPlan, UserSubscription]), ScheduleModule.forRoot()],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, SubscriptionScheduler],
  exports: [SubscriptionService],
})
export class SubscriptionModule {}
