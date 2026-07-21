import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Workspace } from './entities/workspace.entity';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesController } from './workspaces.controller';
import { CreateWorkspaceProvider } from './providers/create-workspace.provider';
import { FindAllWorkspacesProvider } from './providers/find-all-workspaces.provider';
import { FindWorkspaceByIdProvider } from './providers/find-workspace-by-id.provider';
import { UpdateWorkspaceProvider } from './providers/update-workspace.provider';
import { DeleteWorkspaceProvider } from './providers/delete-workspace.provider';
import { CheckWorkspaceAvailabilityProvider } from './providers/check-workspace-availability.provider';

@Module({
  imports: [TypeOrmModule.forFeature([Workspace])],
  controllers: [WorkspacesController],
  providers: [
    WorkspacesService,
    CreateWorkspaceProvider,
    FindAllWorkspacesProvider,
    FindWorkspaceByIdProvider,
    UpdateWorkspaceProvider,
    DeleteWorkspaceProvider,
    CheckWorkspaceAvailabilityProvider,
  ],
  exports: [WorkspacesService, FindWorkspaceByIdProvider],
})
export class WorkspacesModule {}
