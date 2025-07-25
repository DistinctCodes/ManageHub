import { Controller, Get, Post, Body, Param, Res, HttpStatus } from '@nestjs/common';
import { LeaveService } from './leave.service';
import { LeaveRequest } from './leave.model';
import type { Response } from 'express';

const ADMIN_SECRET = 'changeme'; // Change this in production

@Controller('leave')
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post()
  createLeave(@Body() body: { staffName: string; reason: string; startDate: string; endDate: string }, @Res() res: Response) {
    const { staffName, reason, startDate, endDate } = body;
    if (!staffName || !reason || !startDate || !endDate) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Missing required fields' });
    }
    const leave = this.leaveService.createLeaveRequest(
      staffName,
      reason,
      new Date(startDate),
      new Date(endDate)
    );
    return res.status(HttpStatus.CREATED).json(leave);
  }

  @Get()
  getAllLeave(): LeaveRequest[] {
    return this.leaveService.getAllLeaveRequests();
  }

  @Get(':id')
  getLeave(@Param('id') id: string, @Res() res: Response) {
    const leave = this.leaveService.getLeaveRequestById(id);
    if (!leave) return res.status(HttpStatus.NOT_FOUND).json({ message: 'Leave request not found' });
    return res.json(leave);
  }

  @Post(':id/approve')
  approveLeave(@Param('id') id: string, @Body() body: { adminSecret: string; admin: string }, @Res() res: Response) {
    if (body.adminSecret !== ADMIN_SECRET) {
      return res.status(HttpStatus.FORBIDDEN).json({ message: 'Forbidden' });
    }
    if (!body.admin) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Missing admin name' });
    }
    const result = this.leaveService.approveLeaveRequest(id, body.admin);
    if (!result.success) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: result.message });
    }
    return res.json({ message: result.message });
  }

  @Post(':id/reject')
  rejectLeave(@Param('id') id: string, @Body() body: { adminSecret: string; admin: string }, @Res() res: Response) {
    if (body.adminSecret !== ADMIN_SECRET) {
      return res.status(HttpStatus.FORBIDDEN).json({ message: 'Forbidden' });
    }
    if (!body.admin) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: 'Missing admin name' });
    }
    const result = this.leaveService.rejectLeaveRequest(id, body.admin);
    if (!result.success) {
      return res.status(HttpStatus.BAD_REQUEST).json({ message: result.message });
    }
    return res.json({ message: result.message });
  }
} 