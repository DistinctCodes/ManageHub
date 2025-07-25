import { Module } from '@nestjs/common';
import { BiometricService } from './biometric.service';
@Module({
  providers: [BiometricService],
  exports: [BiometricService],
})
export class BiometricModule {} 