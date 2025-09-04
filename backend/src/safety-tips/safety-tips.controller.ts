import { Controller, Get } from '@nestjs/common';
import { SafetyTipsService } from './safety-tips.service';

@Controller('safety-tips')
export class SafetyTipsController {
  constructor(private readonly safetyTipsService: SafetyTipsService) {}

  @Get('today')
  getTodayTip() {
    return { tip: this.safetyTipsService.getTodayTip() };
  }
}
