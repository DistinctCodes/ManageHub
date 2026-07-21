import { Injectable } from '@nestjs/common';
import { FindWorkspaceByIdProvider } from './find-workspace-by-id.provider';
import { WorkspaceBookedSeatsProvider } from './workspace-booked-seats.provider';

export interface AvailabilityResult {
  available: boolean;
  availableSeats: number;
  totalSeats: number;
  startDate: string;
  endDate: string;
  message?: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class CheckWorkspaceAvailabilityProvider {
  constructor(
    private readonly findWorkspaceByIdProvider: FindWorkspaceByIdProvider,
    private readonly workspaceBookedSeatsProvider: WorkspaceBookedSeatsProvider,
  ) {}

  async check(
    workspaceId: string,
    requestedSeats: number = 1,
    startDate?: string,
    endDate?: string,
  ): Promise<AvailabilityResult> {
    const rangeStart = startDate ?? today();
    const rangeEnd = endDate ?? rangeStart;

    const workspace =
      await this.findWorkspaceByIdProvider.findById(workspaceId);

    if (!workspace.isActive) {
      return {
        available: false,
        availableSeats: 0,
        totalSeats: workspace.totalSeats,
        startDate: rangeStart,
        endDate: rangeEnd,
        message: 'Workspace is not active',
      };
    }

    // Live availability: total capacity minus overlapping PENDING/CONFIRMED
    // bookings for the requested range — the same query used by booking
    // creation's conflict check, via WorkspaceBookedSeatsProvider.
    const bookedSeats = await this.workspaceBookedSeatsProvider.getBookedSeats(
      workspaceId,
      rangeStart,
      rangeEnd,
    );
    const availableSeats = Math.max(workspace.totalSeats - bookedSeats, 0);

    const available = availableSeats >= requestedSeats;
    return {
      available,
      availableSeats,
      totalSeats: workspace.totalSeats,
      startDate: rangeStart,
      endDate: rangeEnd,
      message: available ? undefined : `Only ${availableSeats} seats available`,
    };
  }
}
