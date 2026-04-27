import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';

// Minimal stubs — replace with actual entities from your project
class WorkspaceLog {
  memberId: string;
  workspaceId: string;
  type: 'check-in' | 'check-out';
  createdAt: Date;
}

class User {
  email: string;
  role: 'admin' | 'super_admin' | 'member';
}

@Injectable()
export class DailyCheckinSummaryService {
  private readonly logger = new Logger(DailyCheckinSummaryService.name);

  constructor(
    @InjectRepository(WorkspaceLog)
    private readonly logsRepo: Repository<WorkspaceLog>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  @Cron('0 7 * * *') // daily at 7:00 AM
  async sendDailySummary(): Promise<void> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const start = new Date(yesterday.setHours(0, 0, 0, 0));
    const end = new Date(yesterday.setHours(23, 59, 59, 999));

    const logs = await this.logsRepo.find({
      where: { createdAt: Between(start, end) },
    });

    const checkIns = logs.filter((l) => l.type === 'check-in');
    const checkOuts = logs.filter((l) => l.type === 'check-out');
    const uniqueMembers = new Set(logs.map((l) => l.memberId)).size;

    const workspaceCounts = checkIns.reduce<Record<string, number>>((acc, l) => {
      acc[l.workspaceId] = (acc[l.workspaceId] ?? 0) + 1;
      return acc;
    }, {});
    const busiestWorkspace =
      Object.entries(workspaceCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A';

    const admins = await this.usersRepo.find({
      where: [{ role: 'admin' }, { role: 'super_admin' }],
    });

    const subject = `Daily Check-in Summary — ${start.toDateString()}`;
    const body = `Check-ins: ${checkIns.length} | Check-outs: ${checkOuts.length} | Unique members: ${uniqueMembers} | Busiest workspace: ${busiestWorkspace}`;

    for (const admin of admins) {
      // Replace with your mailer service: this.mailer.send(admin.email, subject, body)
      this.logger.log(`[EMAIL] To: ${admin.email} | ${subject} | ${body}`);
    }
  }
}
