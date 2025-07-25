import { Controller, Post, Get, Patch, Body, Query } from '@nestjs/common';
import { LoggingService } from './logging/logging.service';
import { MetricsService } from './metrics/metrics.service';
import { ConfigService } from './config/config.service';
import { QueryLogsDto } from './logging/dto/query-logs.dto';
import { UpdateConfigDto } from './config/dto/update-config.dto';
import { BiometricService } from './biometric/biometric.service';

@Controller()
export class AppController {
  constructor(
    private readonly loggingService: LoggingService,
    private readonly metricsService: MetricsService,
    private readonly configService: ConfigService,
    private readonly biometricService: BiometricService,
  ) {}

  @Post('simulation/start')
  startSimulation() {
    const config = this.configService.getConfig();
    this.biometricService.startSimulation(config.deviceCount, config.syncFrequency);
    return { started: true };
  }

  @Post('simulation/stop')
  stopSimulation() {
    this.biometricService.stopSimulation();
    return { stopped: true };
  }

  @Get('logs')
  async getLogs(@Query() query: QueryLogsDto) {
    return this.loggingService.getLogs(query);
  }

  @Get('metrics')
  getMetrics() {
    return {
      successRate: this.metricsService.getSuccessRate(),
      failureRate: this.metricsService.getFailureRate(),
      averageLatency: this.metricsService.getAverageLatency(),
    };
  }

  @Get('config')
  getConfig() {
    return this.configService.getConfig();
  }

  @Patch('config')
  updateConfig(@Body() dto: UpdateConfigDto) {
    return this.configService.updateConfig(dto);
  }
}
