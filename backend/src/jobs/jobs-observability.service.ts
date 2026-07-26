// @ts-nocheck
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue, Job } from 'bull';

export interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

@Injectable()
export class JobsObservabilityService {
  private readonly logger = new Logger(JobsObservabilityService.name);

  constructor(
    @InjectQueue('email') private emailQueue: Queue,
    @InjectQueue('bookings') private bookingsQueue: Queue,
    @InjectQueue('notifications') private notificationsQueue: Queue,
  ) {}

  private getAllQueues(): Queue[] {
    return [this.emailQueue, this.bookingsQueue, this.notificationsQueue];
  }

  private getQueueByName(name: string): Queue {
    const queue = this.getAllQueues().find((q) => q.name === name);
    if (!queue) {
      throw new NotFoundException(`Queue "${name}" not found`);
    }
    return queue;
  }

  async getQueueStats(queueName: string): Promise<QueueStats> {
    const queue = this.getQueueByName(queueName);
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { name: queueName, waiting, active, completed, failed, delayed };
  }

  async getAllQueueStats(): Promise<QueueStats[]> {
    const queues = this.getAllQueues();
    const stats: QueueStats[] = [];

    for (const queue of queues) {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

      stats.push({
        name: queue.name,
        waiting,
        active,
        completed,
        failed,
        delayed,
      });

      if (failed > 0) {
        this.logger.warn(
          `Queue "${queue.name}" has ${failed} failed job(s)`,
        );
      }

      if (failed >= 3) {
        const failedJobs = await queue.getFailed(0, 2);
        for (const job of failedJobs) {
          this.logger.warn(
            `ALERT: Job ${job.id} in queue "${queue.name}" has failed ${job.attemptsMade} times. Data: ${JSON.stringify(job.data)}`,
          );
        }
      }
    }

    return stats;
  }

  async getFailedJobs(queueName: string, limit = 50): Promise<Job[]> {
    const queue = this.getQueueByName(queueName);
    return queue.getFailed(0, limit);
  }

  async retryJob(queueName: string, jobId: string): Promise<Job> {
    const queue = this.getQueueByName(queueName);
    const job = await queue.getJob(jobId);
    if (!job) {
      throw new NotFoundException(`Job "${jobId}" not found in queue "${queueName}"`);
    }
    await job.retry();
    return job;
  }

  async getDeadLetterQueue(queueName: string): Promise<Job[]> {
    const queue = this.getQueueByName(queueName);
    const failedJobs = await queue.getFailed(0, 100);
    return failedJobs.filter((job) => {
      const maxAttempts = (job.opts?.attempts as number) ?? 3;
      return job.attemptsMade >= maxAttempts;
    });
  }

  async purgeDeadLetterQueue(queueName: string): Promise<{ purged: number }> {
    const queue = this.getQueueByName(queueName);
    const deadJobs = await this.getDeadLetterQueue(queueName);

    for (const job of deadJobs) {
      await job.remove();
    }

    this.logger.log(
      `Purged ${deadJobs.length} dead-letter job(s) from queue "${queueName}"`,
    );

    return { purged: deadJobs.length };
  }
}
