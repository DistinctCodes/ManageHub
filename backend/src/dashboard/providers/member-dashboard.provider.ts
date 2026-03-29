import { Injectable } from '@nestjs/common';

@Injectable()
export class MemberDashboardProvider {
  // Stub implementation for MemberDashboardProvider
  // To be implemented in Issue Parking Reservation System #74
  
  async getMemberDashboard(userId: string) {
    // Placeholder implementation
    return {
      message: 'MemberDashboardProvider stub - to be implemented',
      userId,
    };
  }
}
