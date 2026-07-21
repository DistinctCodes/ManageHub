import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workspace } from '../entities/workspace.entity';
import { UpdateWorkspaceDto } from '../dto/update-workspace.dto';
import { FindWorkspaceByIdProvider } from './find-workspace-by-id.provider';

@Injectable()
export class UpdateWorkspaceProvider {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspacesRepository: Repository<Workspace>,
    private readonly findWorkspaceByIdProvider: FindWorkspaceByIdProvider,
  ) {}

  async update(id: string, dto: UpdateWorkspaceDto): Promise<Workspace> {
    const workspace = await this.findWorkspaceByIdProvider.findById(id);

    // If totalSeats is being increased, increase availableSeats proportionally
    if (dto.totalSeats && dto.totalSeats > workspace.totalSeats) {
      const added = dto.totalSeats - workspace.totalSeats;
      workspace.availableSeats = workspace.availableSeats + added;
    }

    Object.assign(workspace, dto);
    return this.workspacesRepository.save(workspace);
  }

  /**
   * Adjusts the approximate availableSeats counter by `delta` (positive to
   * free seats, negative to consume them), clamped to [0, totalSeats].
   */
  async adjustAvailableSeats(id: string, delta: number): Promise<void> {
    const workspace = await this.findWorkspaceByIdProvider.findById(id);
    const next = workspace.availableSeats + delta;
    workspace.availableSeats = Math.min(
      Math.max(next, 0),
      workspace.totalSeats,
    );
    await this.workspacesRepository.save(workspace);
  }
}
