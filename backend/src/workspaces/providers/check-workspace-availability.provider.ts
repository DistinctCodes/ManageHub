import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workspace } from '../entities/workspace.entity';
import { FindWorkspaceByIdProvider } from './find-workspace-by-id.provider';

export interface AvailabilityResult {
  available: boolean;
  availableSeats: number;
  totalSeats: number;
  message?: string;
}

@Injectable()
export class CheckWorkspaceAvailabilityProvider {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspacesRepository: Repository<Workspace>,
    private readonly findWorkspaceByIdProvider: FindWorkspaceByIdProvider,
  ) {}

  async check(
    workspaceId: string,
    requestedSeats: number = 1,
  ): Promise<AvailabilityResult> {
    const workspace =
      await this.findWorkspaceByIdProvider.findById(workspaceId);

    if (!workspace.isActive) {
      return {
        available: false,
        availableSeats: 0,
        totalSeats: workspace.totalSeats,
        message: 'Workspace is not active',
      };
    }

    const available = workspace.availableSeats >= requestedSeats;
    return {
      available,
      availableSeats: workspace.availableSeats,
      totalSeats: workspace.totalSeats,
      message: available
        ? undefined
        : `Only ${workspace.availableSeats} seats available`,
    };
  }
}
