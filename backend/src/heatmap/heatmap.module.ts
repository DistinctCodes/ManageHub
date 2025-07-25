import { Module } from '@nestjs/common';
import { HeatmapService } from './heatmap.service';
import { HeatmapController } from './heatmap.controller';

@Module({
  providers: [HeatmapService],
  controllers: [HeatmapController],
})
export class HeatmapModule {} 