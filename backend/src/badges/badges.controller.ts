import { Controller, Get, Param } from '@nestjs/common';
import { BadgesService, Badge } from './badges.service';

@Controller('badges')
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  @Get()
  getAllBadges(): Badge[] {
    return this.badgesService.getAllBadges();
  }

  @Get('user/:userId')
  getUserBadges(@Param('userId') userId: string): Badge[] {
    return this.badgesService.getUserBadges(userId);
  }
} 