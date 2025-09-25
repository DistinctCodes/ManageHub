import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get()
  getHealth() {
    return {
      status: 'OK',
      message: 'Server is running',
      Timestamp: Date.now(),
    };
  }
}
