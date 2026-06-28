import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReferralsService } from './referrals.service';
import { JwtAuthGuard } from '../auth/guard/jwt.auth.guard';
import { CurrentUser } from '../auth/decorators/current.user.decorators';
import { User } from '../users/entities/user.entity';

@ApiTags('Referrals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly service: ReferralsService) {}

  @Get('my-code')
  async getMyCode(@CurrentUser() user: User) {
    const data = await this.service.getMyCode(user.id);
    return { data };
  }

  @Get('history')
  async getHistory(@CurrentUser() user: User) {
    const data = await this.service.getHistory(user.id);
    return { data };
  }
}
