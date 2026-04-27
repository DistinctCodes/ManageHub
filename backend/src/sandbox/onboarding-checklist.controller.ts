import { Controller, Get } from '@nestjs/common';
import { OnboardingChecklistService } from './onboarding-checklist.service';
import { CurrentUser } from '../auth/decorators/current.user.decorators';
import { User } from '../users/entities/user.entity';

@Controller('sandbox/onboarding')
export class OnboardingChecklistController {
  constructor(private readonly checklistService: OnboardingChecklistService) {}

  @Get('checklist')
  getChecklist(@CurrentUser() user: User) {
    return this.checklistService.getChecklist(user);
  }
}
