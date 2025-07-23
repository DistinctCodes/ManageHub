import { Injectable } from '@nestjs/common';

export type Badge = {
  id: string;
  name: string;
  description: string;
};

export type User = {
  id: string;
  name: string;
};

// Mock attendance data: userId -> array of attended dates (ISO strings)
const mockAttendance: Record<string, string[]> = {
  'user1': Array.from({ length: 30 }, (_, i) => `2023-05-${String(i + 1).padStart(2, '0')}`),
  'user2': Array.from({ length: 10 }, (_, i) => `2023-05-${String(i + 1).padStart(2, '0')}`),
};

@Injectable()
export class BadgesService {
  private badges: Badge[] = [
    {
      id: 'attendance-30',
      name: '30-Day Attendance',
      description: 'Attended 30 days in a row',
    },
  ];

  getAllBadges(): Badge[] {
    return this.badges;
  }

  getUserBadges(userId: string): Badge[] {
    const attendance = mockAttendance[userId] || [];
    const userBadges: Badge[] = [];
    // 30-day attendance badge
    if (attendance.length >= 30) {
      userBadges.push(this.badges[0]);
    }
    return userBadges;
  }
} 