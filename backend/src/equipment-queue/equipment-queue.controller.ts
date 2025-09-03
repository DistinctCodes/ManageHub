import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { EquipmentQueueService } from './equipment-queue.service';

@Controller('equipment-queue')
export class EquipmentQueueController {
  constructor(private readonly queueService: EquipmentQueueService) {}

  @Post('join')
  joinQueue(@Body('equipment') equipment: string, @Body('userId') userId: string) {
    const position = this.queueService.joinQueue(equipment, userId);
    const estimatedWait = this.queueService.getEstimatedWait(equipment, userId);
    return { position, estimatedWaitMinutes: estimatedWait };
  }

  @Get('status')
  getStatus(@Query('equipment') equipment: string, @Query('userId') userId: string) {
    const position = this.queueService.getPosition(equipment, userId);
    const estimatedWait = this.queueService.getEstimatedWait(equipment, userId);
    return { position, estimatedWaitMinutes: estimatedWait };
  }
}
