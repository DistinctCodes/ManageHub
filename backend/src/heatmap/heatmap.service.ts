import { Injectable } from '@nestjs/common';

export type HeatmapSlot = {
  workspaceId: string;
  timeSlot: string; // e.g. '09:00-10:00'
  usage: number; // 0-100
};

@Injectable()
export class HeatmapService {
  private readonly workspaces = ['A', 'B', 'C', 'D'];
  private readonly timeSlots = [
    '08:00-09:00', '09:00-10:00', '10:00-11:00', '11:00-12:00',
    '12:00-13:00', '13:00-14:00', '14:00-15:00', '15:00-16:00',
  ];
  private readonly data: HeatmapSlot[] = [];

  constructor() {
    this.generateMockData();
  }

  private generateMockData() {
    this.data.length = 0;
    for (const workspaceId of this.workspaces) {
      for (const timeSlot of this.timeSlots) {
        this.data.push({
          workspaceId,
          timeSlot,
          usage: Math.floor(Math.random() * 101),
        });
      }
    }
  }

  getAll(): HeatmapSlot[] {
    return this.data;
  }

  getByWorkspace(workspaceId: string): HeatmapSlot[] {
    return this.data.filter(d => d.workspaceId === workspaceId);
  }

  getByTimeSlot(timeSlot: string): HeatmapSlot[] {
    return this.data.filter(d => d.timeSlot === timeSlot);
  }
} 