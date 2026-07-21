import { Injectable } from '@nestjs/common';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { WorkspaceQueryDto } from './dto/workspace-query.dto';
import { CreateWorkspaceProvider } from './providers/create-workspace.provider';
import { FindAllWorkspacesProvider } from './providers/find-all-workspaces.provider';
import { FindWorkspaceByIdProvider } from './providers/find-workspace-by-id.provider';
import { UpdateWorkspaceProvider } from './providers/update-workspace.provider';
import { DeleteWorkspaceProvider } from './providers/delete-workspace.provider';
import { CheckWorkspaceAvailabilityProvider } from './providers/check-workspace-availability.provider';
import { Workspace } from './entities/workspace.entity';

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly createWorkspaceProvider: CreateWorkspaceProvider,
    private readonly findAllWorkspacesProvider: FindAllWorkspacesProvider,
    private readonly findWorkspaceByIdProvider: FindWorkspaceByIdProvider,
    private readonly updateWorkspaceProvider: UpdateWorkspaceProvider,
    private readonly deleteWorkspaceProvider: DeleteWorkspaceProvider,
    private readonly checkWorkspaceAvailabilityProvider: CheckWorkspaceAvailabilityProvider,
  ) {}

  create(dto: CreateWorkspaceDto) {
    return this.createWorkspaceProvider.create(dto);
  }

  findAll(query: WorkspaceQueryDto, adminView = false) {
    return this.findAllWorkspacesProvider.findAll(query, adminView);
  }

  findById(id: string): Promise<Workspace> {
    return this.findWorkspaceByIdProvider.findById(id);
  }

  update(id: string, dto: UpdateWorkspaceDto) {
    return this.updateWorkspaceProvider.update(id, dto);
  }

  softDelete(id: string) {
    return this.deleteWorkspaceProvider.softDelete(id);
  }

  checkAvailability(workspaceId: string, requestedSeats?: number) {
    return this.checkWorkspaceAvailabilityProvider.check(
      workspaceId,
      requestedSeats,
    );
  }
}
