import { Module } from '@nestjs/common';
import { SafetyTipsService } from './safety-tips.service';
import { SafetyTipsController } from './safety-tips.controller';

@Module({
  controllers: [SafetyTipsController],
  providers: [SafetyTipsService],
})
export class SafetyTipsModule {}
