import { Injectable } from '@nestjs/common';

interface QueueEntry {
  userId: string;
  joinedAt: Date;
}

@Injectable()
export class EquipmentQueueService {
  // Map of equipment name to queue
  private queues: Record<string, QueueEntry[]> = {};
  // Assume each user gets 30 minutes
  private readonly usageDurationMinutes = 30;

  joinQueue(equipment: string, userId: string): number {
    if (!this.queues[equipment]) {
      this.queues[equipment] = [];
    }
    // Prevent duplicate join
    if (this.queues[equipment].some(entry => entry.userId === userId)) {
      return this.getPosition(equipment, userId);
    }
    this.queues[equipment].push({ userId, joinedAt: new Date() });
    return this.queues[equipment].length;
  }

  getPosition(equipment: string, userId: string): number {
    const queue = this.queues[equipment] || [];
    const idx = queue.findIndex(entry => entry.userId === userId);
    return idx === -1 ? 0 : idx + 1;
  }

  getEstimatedWait(equipment: string, userId: string): number {
    const pos = this.getPosition(equipment, userId);
    if (pos === 0) return 0;
    return (pos - 1) * this.usageDurationMinutes;
  }

  getQueue(equipment: string): QueueEntry[] {
    return this.queues[equipment] || [];
  }
}
