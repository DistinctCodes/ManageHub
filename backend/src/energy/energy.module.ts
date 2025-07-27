import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { EnergyConsumption } from './entities/energy-consumption.entity';
import { EnergyConsumptionService } from './services/energy-consumption.service';
import { EnergyConsumptionController } from './controllers/energy-consumption.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([EnergyConsumption]),
    ScheduleModule.forRoot(),
  ],
  controllers: [EnergyConsumptionController],
  providers: [EnergyConsumptionService],
  exports: [EnergyConsumptionService],
})
export class EnergyModule {}