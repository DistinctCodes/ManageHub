import { Injectable, Logger } from "@nestjs/common"
import { Cron, CronExpression } from "@nestjs/schedule"
import type { SubscriptionService } from "./subscription.service"

@Injectable()
export class SubscriptionScheduler {
  private readonly logger = new Logger(SubscriptionScheduler.name)

  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredSubscriptions() {
    this.logger.log("Running scheduled task: Expiring outdated subscriptions")
    await this.subscriptionService.expireSubscriptions()
    this.logger.log("Completed expiring outdated subscriptions")
  }
}
