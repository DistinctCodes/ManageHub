import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ReferralsService } from './referrals.service';
import { JwtAuthGuard } from '../auth/guard/jwt.auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { GetCurrentUser } from '../auth/decorators/getCurrentUser.decorator';
import { UserRole } from '../users/enums/userRoles.enum';

@ApiTags('Referrals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('referrals')
export class ReferralsController {
  constructor(private readonly service: ReferralsService) {}

  @Get('my-code')
  async getMyCode(@GetCurrentUser('id') userId: string) {
    return { data: await this.service.getMyCode(userId) };
  }

  @Get('stats')
  async getStats(@GetCurrentUser('id') userId: string) {
    return { data: await this.service.getStats(userId) };
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getAll() {
    return { data: await this.service.getAll() };
  }
}
