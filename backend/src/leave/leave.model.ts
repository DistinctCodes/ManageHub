export type LeaveStatus = 'pending' | 'approved' | 'rejected';

export interface LeaveRequest {
  id: string;
  staffName: string;
  reason: string;
  startDate: Date;
  endDate: Date;
  status: LeaveStatus;
  createdAt: Date;
  decisionBy: string | null;
  decisionAt: Date | null;
} 