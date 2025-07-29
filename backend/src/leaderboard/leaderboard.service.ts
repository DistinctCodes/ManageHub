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

  getLeaderboard(): { name: string; score: number }[] {
    // Convert checkIns to a score (you can customize the scoring logic)
    const leaderboard = this.mockData.map((attendee) => ({
      name: attendee.name,
      score: attendee.checkIns,
    }));

    // Sort descending by score
    return leaderboard.sort((a, b) => b.score - a.score);
  }
}
