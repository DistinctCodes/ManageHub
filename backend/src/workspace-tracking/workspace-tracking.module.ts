import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceLog } from './entities/workspace-log.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { User } from '../users/entities/user.entity';
import { WorkspaceTrackingService } from './workspace-tracking.service';
import { WorkspaceTrackingController } from './workspace-tracking.controller';
import { CheckInProvider } from './providers/check-in.provider';
import { OccupancyProvider } from './providers/occupancy.provider';
import { BiometricAuthProvider } from './providers/biometric-auth.provider';

@Module({
  imports: [TypeOrmModule.forFeature([WorkspaceLog, Workspace, User])],
  controllers: [WorkspaceTrackingController],
  providers: [
    WorkspaceTrackingService,
    CheckInProvider,
    OccupancyProvider,
    BiometricAuthProvider,
  ],
  exports: [WorkspaceTrackingService],
})
export class WorkspaceTrackingModule {}
