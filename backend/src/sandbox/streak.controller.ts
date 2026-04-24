import { Controller, Get } from '@nestjs/common';
import { StreakService } from './streak.service';
import { CurrentUser } from '../auth/decorators/current.user.decorators';
import { User } from '../users/entities/user.entity';

@Controller('sandbox/streaks')
export class StreakController {
  constructor(private readonly streakService: StreakService) {}

  /** GET /sandbox/streaks/me — returns the current user's check-in streak */
  @Get('me')
  getMyStreak(@CurrentUser() user: User) {
    return this.streakService.getStreakForUser(user.id);
  }
}
