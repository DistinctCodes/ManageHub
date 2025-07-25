import { Injectable } from '@nestjs/common';
import { LeaveRequest, LeaveStatus } from './leave.model';
import { randomUUID } from 'crypto';

@Injectable()
export class LeaveService {
  private leaveRequests: LeaveRequest[] = [];

  createLeaveRequest(staffName: string, reason: string, startDate: Date, endDate: Date): LeaveRequest {
    const leave: LeaveRequest = {
      id: randomUUID(),
      staffName,
      reason,
      startDate,
      endDate,
      status: 'pending',
      createdAt: new Date(),
      decisionBy: null,
      decisionAt: null,
    };
    this.leaveRequests.push(leave);
    return leave;
  }

  getAllLeaveRequests(): LeaveRequest[] {
    return this.leaveRequests;
  }

  getLeaveRequestById(id: string): LeaveRequest | undefined {
    return this.leaveRequests.find(lr => lr.id === id);
  }

  approveLeaveRequest(id: string, admin: string): { success: boolean; message: string } {
    const leave = this.getLeaveRequestById(id);
    if (!leave) return { success: false, message: 'Leave request not found' };
    if (leave.status !== 'pending') return { success: false, message: 'Request already decided' };
    leave.status = 'approved';
    leave.decisionBy = admin;
    leave.decisionAt = new Date();
    return { success: true, message: 'Leave request approved' };
  }

  rejectLeaveRequest(id: string, admin: string): { success: boolean; message: string } {
    const leave = this.getLeaveRequestById(id);
    if (!leave) return { success: false, message: 'Leave request not found' };
    if (leave.status !== 'pending') return { success: false, message: 'Request already decided' };
    leave.status = 'rejected';
    leave.decisionBy = admin;
    leave.decisionAt = new Date();
    return { success: true, message: 'Leave request rejected' };
  }
} 