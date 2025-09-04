import { Injectable } from '@nestjs/common';

@Injectable()
export class SafetyTipsService {
  tips: string[] = [
    'Always wear your seatbelt while driving.',
    'Wash your hands regularly to prevent illness.',
    'Keep emergency numbers handy.',
    'Stay hydrated throughout the day.',
    'Be aware of your surroundings at all times.',
    'Install smoke detectors in your home.',
    'Take regular breaks when working on a computer.',
    'Check fire exits in new buildings.',
    'Do not share personal information with strangers.',
    'Store chemicals out of reach of children.',
    'Use handrails on stairs.',
    'Wear appropriate safety gear for activities.',
    'Lock doors and windows at night.',
    'Have a first aid kit accessible.',
    'Plan an emergency evacuation route.',
    'Avoid using your phone while walking in traffic.',
    'Test smoke alarms monthly.',
    'Keep walkways clear to prevent trips and falls.',
    'Do not overload electrical outlets.',
    'Learn basic CPR and first aid.',
  ];

  /**
   * Returns the safety tip for today or for a given date.
   * @param date Optional date for which to get the tip (for testing)
   */
  getTodayTip(date?: Date): string {
    const today = date || new Date();
    const start = new Date(today.getFullYear(), 0, 0);
    const diff = today.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    if (!this.tips.length) {
      return 'Stay safe!';
    }
    return this.tips[dayOfYear % this.tips.length];
  }
}
