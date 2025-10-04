import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { I18n, I18nContext } from 'nestjs-i18n';
import { Public } from './auth/decorators/public.decorator'; // Assuming you have a Public decorator to bypass JWT

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // --- ADD THIS NEW ENDPOINT FOR TESTING I18N ---
  @Public() // Use your decorator to make this route public if needed
  @Get('greeting')
  getGreeting(@I18n() i18n: I18nContext) {
    // The key 'translation.GREETING' matches 'translation.json' and the 'GREETING' key inside it.
    return i18n.t('translation.GREETING');
  }

  @Get('health')
  getHealth() {
    return {
      status: 'OK',
      message: 'Server is running',
      Timestamp: Date.now(),
    };
  }
}
