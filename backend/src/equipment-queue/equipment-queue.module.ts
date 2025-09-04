import { Module } from '@nestjs/common';
import { EquipmentQueueService } from './equipment-queue.service';
import { EquipmentQueueController } from './equipment-queue.controller';

@Module({
  controllers: [EquipmentQueueController],
  providers: [EquipmentQueueService],
})
export class EquipmentQueueModule {}
