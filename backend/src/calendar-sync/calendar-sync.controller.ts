import { Controller, Get, Delete, Query, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { CalendarSyncService } from './calendar-sync.service';
import { GetCurrentUser } from '../auth/decorators/getCurrentUser.decorator';
import { JwtAuthGuard } from '../auth/guard/jwt.auth.guard';

@ApiTags('Calendar Sync')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('calendar-sync')
export class CalendarSyncController {
  constructor(
    private readonly service: CalendarSyncService,
    private readonly config: ConfigService,
  ) {}

  @Get('auth/google')
  getAuthUrl() {
    return { url: this.service.getAuthUrl() };
  }

  @Get('auth/google/callback')
  async handleCallback(
    @Query('code') code: string,
    @GetCurrentUser('id') userId: string,
    @Res() res: Response,
  ) {
    await this.service.handleCallback(code, userId);
    const frontendUrl = this.config.get('FRONTEND_URL') || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/settings?calendarConnected=true`);
  }

  @Delete('disconnect')
  async disconnect(@GetCurrentUser('id') userId: string) {
    await this.service.disconnect(userId);
    return { message: 'Calendar disconnected' };
  }

  @Get('status')
  async getStatus(@GetCurrentUser('id') userId: string) {
    return this.service.getStatus(userId);
  }
}
