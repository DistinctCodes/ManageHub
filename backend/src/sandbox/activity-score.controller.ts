import { Controller, Get, Param, ForbiddenException } from '@nestjs/common';
import { ActivityScoreService } from './activity-score.service';
import { CurrentUser } from '../auth/decorators/current.user.decorators';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/userRoles.enum';

@Controller('sandbox/members')
export class ActivityScoreController {
  constructor(private readonly activityScoreService: ActivityScoreService) {}

  /** GET /sandbox/members/activity-score — current user's score */
  @Get('activity-score')
  getMyScore(@CurrentUser() user: User) {
    return this.activityScoreService.getActivityScore(user.id);
  }

  /** GET /sandbox/members/:userId/activity-score — admin only */
  @Get(':userId/activity-score')
  getScoreForUser(@Param('userId') userId: string, @CurrentUser() user: User) {
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Admin access required');
    }
    return this.activityScoreService.getActivityScore(userId);
  }
}
