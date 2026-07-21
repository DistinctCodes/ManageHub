import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Workspace } from './entities/workspace.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { WorkspacesService } from './workspaces.service';
import { WorkspacesController } from './workspaces.controller';
import { CreateWorkspaceProvider } from './providers/create-workspace.provider';
import { FindAllWorkspacesProvider } from './providers/find-all-workspaces.provider';
import { FindWorkspaceByIdProvider } from './providers/find-workspace-by-id.provider';
import { UpdateWorkspaceProvider } from './providers/update-workspace.provider';
import { DeleteWorkspaceProvider } from './providers/delete-workspace.provider';
import { CheckWorkspaceAvailabilityProvider } from './providers/check-workspace-availability.provider';
import { WorkspaceBookedSeatsProvider } from './providers/workspace-booked-seats.provider';

@Module({
  // Booking is registered here (in addition to BookingsModule) so this module
  // can read live seat availability without importing BookingsModule, which
  // itself imports WorkspacesModule — that would create a circular dependency.
  imports: [TypeOrmModule.forFeature([Workspace, Booking])],
  controllers: [WorkspacesController],
  providers: [
    WorkspacesService,
    CreateWorkspaceProvider,
    FindAllWorkspacesProvider,
    FindWorkspaceByIdProvider,
    UpdateWorkspaceProvider,
    DeleteWorkspaceProvider,
    CheckWorkspaceAvailabilityProvider,
    WorkspaceBookedSeatsProvider,
  ],
  exports: [
    WorkspacesService,
    FindWorkspaceByIdProvider,
    WorkspaceBookedSeatsProvider,
  ],
})
export class WorkspacesModule {}
