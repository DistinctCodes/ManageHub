import { Module } from '@nestjs/common';
import { ErrorSimulatorService } from './error-simulator.service';
@Module({
  providers: [ErrorSimulatorService],
  exports: [ErrorSimulatorService],
})
export class ErrorSimulationModule {} 