import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FloorPlan } from './entities/floor-plan.entity';
import { FloorPlanZone } from './entities/floor-plan-zone.entity';
import { FloorPlanService } from './floor-plan.service';
import { FloorPlanController } from './floor-plan.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FloorPlan, FloorPlanZone])],
  controllers: [FloorPlanController],
  providers: [FloorPlanService],
  exports: [FloorPlanService],
})
export class FloorPlanModule {}
