import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class EnvironmentMonitorService {
  private readonly logger = new Logger(EnvironmentMonitorService.name);

  @Cron('0 * * * *')
  logEnvironmentalMetrics() {
    const temperature = (20 + Math.random() * 10).toFixed(2);
    const humidity = (40 + Math.random() * 30).toFixed(2);
    const airQualityIndex = Math.floor(50 + Math.random() * 50);

    this.logger.log(
      `🌡️ Temp: ${temperature}°C | 💧 Humidity: ${humidity}% | 🌫️ AQI: ${airQualityIndex}`,
    );
  }
}
