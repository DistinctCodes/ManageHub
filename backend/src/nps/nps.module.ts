import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ConfigModule } from '@nestjs/config';
import { NpsSurveyResponse } from './entities/nps-survey-response.entity';
import { NpsService } from './nps.service';
import { NpsController } from './nps.controller';
import { NpsSurveyProcessor, NPS_QUEUE } from './nps-survey.processor';
import { User } from '../users/entities/user.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([NpsSurveyResponse, User, Workspace]),
    BullModule.registerQueue({ name: NPS_QUEUE }),
    ConfigModule,
  ],
  controllers: [NpsController],
  providers: [NpsService, NpsSurveyProcessor],
  exports: [NpsService],
})
export class NpsModule {}
