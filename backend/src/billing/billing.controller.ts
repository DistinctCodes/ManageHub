import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guard/jwt.auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { CurrentUser } from '../auth/decorators/current.user.decorators';
import { UserRole } from '../users/enums/userRoles.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('Billing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('billing')
export class BillingController {
  constructor(private readonly service: BillingService) {}

  @Get('cycles')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async findAll() {
    const data = await this.service.findAll();
    return { data };
  }

  @Get('my-cycles')
  async findMine(@CurrentUser() user: User) {
    const data = await this.service.findAll(user.id);
    return { data };
  }
}
