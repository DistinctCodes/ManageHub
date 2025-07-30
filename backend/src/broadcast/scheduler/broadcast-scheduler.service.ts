import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BroadcastService } from '../broadcast.service';

@Injectable()
export class BroadcastSchedulerService {
  private readonly logger = new Logger(BroadcastSchedulerService.name);

  constructor(private readonly broadcastService: BroadcastService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleScheduledBroadcasts() {
    this.logger.log('Checking for scheduled broadcasts...');

    const now = new Date();
    const pendingBroadcasts = await this.broadcastService.findPendingBroadcasts(now);

    for (const broadcast of pendingBroadcasts) {
      this.logger.log(`Publishing broadcast "${broadcast.title}" scheduled at ${broadcast.scheduledAt.toISOString()}`);

      broadcast.isPublished = true;
      await this.broadcastService.save(broadcast);

      // Optional: Trigger additional logic like email or logging
    }
  }
}
