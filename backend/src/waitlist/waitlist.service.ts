import { Injectable } from '@nestjs/common';

@Injectable()
export class WaitlistService {
  private queues: Record<string, string[]> = {};

  queueMember(workspaceId: string, userId: string) {
    if (!this.queues[workspaceId]) this.queues[workspaceId] = [];
    this.queues[workspaceId].push(userId);
    return { status: 'queued', position: this.queues[workspaceId].length };
  }

  getQueue(workspaceId: string) {
    return this.queues[workspaceId] || [];
  }
}
