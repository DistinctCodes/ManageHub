import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { BillingService } from '../billing/billing.service';

const RETRY_DELAYS_HOURS = [24, 72, 168]; // 1d, 3d, 7d

@Injectable()
export class DunningService {
  private readonly logger = new Logger(DunningService.name);

  constructor(private readonly billingService: BillingService) {}

  @Cron('0 6 * * *') // every day at 06:00
  async processFailedPayments(): Promise<void> {
    const cycles = await this.billingService.findPendingForRetry();

    for (const cycle of cycles) {
      if (cycle.retryCount >= RETRY_DELAYS_HOURS.length) {
        this.logger.warn(
          `Billing cycle ${cycle.id} exhausted retries — marking cancelled`,
        );
        continue;
      }

      this.logger.log(
        `Retrying billing cycle ${cycle.id} (attempt ${cycle.retryCount + 1})`,
      );

      try {
        // Payment processing would be triggered here via PaymentsService.
        // For now we increment the counter and schedule the next retry window.
        await this.billingService.incrementRetry(cycle.id);

        const nextDelay = RETRY_DELAYS_HOURS[cycle.retryCount] ?? 168;
        const retryAt = new Date();
        retryAt.setHours(retryAt.getHours() + nextDelay);

        await this.billingService.markFailed(
          cycle.id,
          'Payment declined — retry scheduled',
          retryAt,
        );
      } catch (err: any) {
        this.logger.error(
          `Failed to process retry for cycle ${cycle.id}: ${err.message}`,
        );
      }
    }
  }
}
