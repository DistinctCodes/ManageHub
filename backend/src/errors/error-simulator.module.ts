import { Module, forwardRef } from '@nestjs/common';
import { ErrorSimulatorService } from './error-simulator.service';
import { ConfigModule } from '../config/config.module';
@Module({
  imports: [forwardRef(() => ConfigModule)],
  providers: [ErrorSimulatorService],
  exports: [ErrorSimulatorService],
})
export class ErrorSimulationModule {} 