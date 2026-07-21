import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, LessThan, Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { WorkspaceLog } from '../../workspace-tracking/entities/workspace-log.entity';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationType } from '../../notifications/enums/notification-type.enum';

@Injectable()
export class StaleCheckinJob {
  private readonly logger = new Logger(StaleCheckinJob.name);

  constructor(
    @InjectRepository(WorkspaceLog)
    private readonly logsRepository: Repository<WorkspaceLog>,
    private readonly notificationsService: NotificationsService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Runs every hour. Finds workspace check-ins that have been open longer
   * than CHECKIN_MAX_HOURS (default: 12) and force-closes them, computing
   * durationMinutes the same way the normal checkout path does.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async closeStaleCheckIns(): Promise<void> {
    const maxHours = parseInt(
      this.configService.get<string>('CHECKIN_MAX_HOURS') ?? '12',
      10,
    );
    const threshold = new Date(Date.now() - maxHours * 60 * 60 * 1000);

    const staleLogs = await this.logsRepository.find({
      where: {
        checkedOutAt: IsNull(),
        checkedInAt: LessThan(threshold),
      },
    });

    if (staleLogs.length === 0) {
      this.logger.log('StaleCheckinJob: no stale check-ins found');
      return;
    }

    this.logger.log(
      `StaleCheckinJob: found ${staleLogs.length} stale check-in(s) to close`,
    );

    let closed = 0;

    for (const log of staleLogs) {
      try {
        const now = new Date();

        // Reuse the same duration formula as CheckInProvider.checkOut()
        log.checkedOutAt = now;
        log.durationMinutes = Math.round(
          (now.getTime() - log.checkedInAt.getTime()) / 60000,
        );
        // Mark as auto-closed via the notes field so utilization stats can
        // distinguish force-closed logs from voluntary check-outs.
        log.notes = log.notes
          ? `${log.notes} [auto-closed after ${maxHours}h]`
          : `[auto-closed after ${maxHours}h]`;

        await this.logsRepository.save(log);

        // Notify the member
        await this.notificationsService.create({
          userId: log.userId,
          type: NotificationType.GENERAL,
          title: 'Workspace check-in closed automatically',
          message: `Your check-in was automatically closed after ${maxHours} hours of inactivity. Duration recorded: ${log.durationMinutes} minute(s).`,
          metadata: {
            workspaceLogId: log.id,
            workspaceId: log.workspaceId,
            durationMinutes: log.durationMinutes,
          },
        });

        closed++;
      } catch (err) {
        this.logger.error(
          `StaleCheckinJob: failed to close log ${log.id}: ${(err as Error).message}`,
        );
      }
    }

    this.logger.log(`StaleCheckinJob: closed ${closed}/${staleLogs.length} stale check-in(s)`);
  }
}