import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceLog } from '../../workspace-tracking/entities/workspace-log.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { AnalyticsController } from './analytics.controller';
import { OccupancyRateProvider } from './providers/occupancy-rate.provider';

@Module({
  imports: [TypeOrmModule.forFeature([WorkspaceLog, Workspace])],
  controllers: [AnalyticsController],
  providers: [OccupancyRateProvider],
})
export class SandboxAnalyticsModule {}
