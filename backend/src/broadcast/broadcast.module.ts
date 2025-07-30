import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Broadcast } from './entities/broadcast.entity';
import { BroadcastService } from './broadcast.service';
import { BroadcastController } from './broadcast.controller';

import { BroadcastSchedulerService } from './scheduler/broadcast-scheduler.service';


@Module({
  imports: [TypeOrmModule.forFeature([Broadcast])],
  controllers: [BroadcastController],
  providers: [BroadcastService, BroadcastSchedulerService],
  exports: [BroadcastService],
})
export class BroadcastModule {}
