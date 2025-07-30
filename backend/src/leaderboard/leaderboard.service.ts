import { Injectable } from '@nestjs/common';

interface Attendee {
  name: string;
  checkIns: number;
}

@Injectable()
export class LeaderboardService {
  private mockData: Attendee[] = [
    { name: 'Alice', checkIns: 12 },
    { name: 'Bob', checkIns: 9 },
    { name: 'Charlie', checkIns: 15 },
    { name: 'Diana', checkIns: 8 },
    { name: 'Eve', checkIns: 20 },
  ];

  getLeaderboard(): { rank: number; name: string; score: number }[] {
    // Map check-ins to leaderboard scores
    const leaderboard = this.mockData
      .map((attendee) => ({
        name: attendee.name,
        score: attendee.checkIns,
      }))
      .sort((a, b) => b.score - a.score) // Sort by score descending
      .map((attendee, index) => ({
        rank: index + 1,
        ...attendee,
      }));

    return leaderboard;
  }
}
