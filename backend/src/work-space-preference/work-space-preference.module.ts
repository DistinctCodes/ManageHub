import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspacePreference } from './entities/work-space-preference.entity';
import { WorkspacePreferencesController } from './work-space-preference.controller';
import { WorkspacePreferencesService } from './work-space-preference.service';

@Module({
  imports: [TypeOrmModule.forFeature([WorkspacePreference])],
  controllers: [WorkspacePreferencesController],
  providers: [WorkspacePreferencesService],
  exports: [WorkspacePreferencesService],
})
export class WorkspacePreferencesModule {}
