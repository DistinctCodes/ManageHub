import { Module, forwardRef } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncScheduler } from './sync.scheduler';
import { BiometricModule } from '../biometric/biometric.module';
@Module({
  imports: [forwardRef(() => BiometricModule)],
  providers: [SyncService, SyncScheduler],
  exports: [SyncService],
})
export class SyncModule {} 