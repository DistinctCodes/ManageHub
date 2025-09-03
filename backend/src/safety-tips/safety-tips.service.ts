import { Injectable } from '@nestjs/common';

@Injectable()
export class SafetyTipsService {
  private readonly tips: string[] = [
    'Always wear your seatbelt while driving.',
    'Wash your hands regularly to prevent illness.',
    'Keep emergency numbers handy.',
    'Stay hydrated throughout the day.',
    'Be aware of your surroundings at all times.',
    'Install smoke detectors in your home.',
    'Take regular breaks when working on a computer.',
  ];

  getTodayTip(): string {
    const today = new Date();
    // Calculate the index based on the day of the year
    const start = new Date(today.getFullYear(), 0, 0);
    const diff = today.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    return this.tips[dayOfYear % this.tips.length];
  }
}
