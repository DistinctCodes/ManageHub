import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { MembershipPlansService } from './membership-plans.service';
import { CreateMembershipPlanDto } from './dto/create-membership-plan.dto';
import { UpdateMembershipPlanDto } from './dto/update-membership-plan.dto';
import { GetCurrentUser } from '../auth/decorators/getCurrentUser.decorator';
import { Roles } from '../auth/decorators/roles.decorators';
import { RolesGuard } from '../auth/guard/roles.guard';
import { UserRole } from '../users/enums/userRoles.enum';
import { Public } from '../auth/decorators/public.decorator';
import { UseGuards } from '@nestjs/common';

@ApiTags('Membership Plans')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('membership-plans')
export class MembershipPlansController {
  constructor(private readonly service: MembershipPlansService) {}

  /** GET /membership-plans — public: list active plans */
  @Get()
  @Public()
  @ApiOperation({ summary: 'List all active membership plans (public)' })
  async findAll() {
    const data = await this.service.findAllActive();
    return { message: 'Plans retrieved', data };
  }

  /** GET /membership-plans/my-subscription — authenticated member */
  @Get('my-subscription')
  @Roles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get current user active subscription' })
  async getMySubscription(@GetCurrentUser('id') userId: string) {
    const data = await this.service.getMySubscription(userId);
    return { message: 'Subscription retrieved', data };
  }

  /** GET /membership-plans/:id — public: plan detail */
  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get membership plan detail (public)' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.service.findById(id);
    return { message: 'Plan retrieved', data };
  }

  /** POST /membership-plans — admin only: create plan */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a membership plan (admin)' })
  async create(@Body() dto: CreateMembershipPlanDto) {
    const data = await this.service.create(dto);
    return { message: 'Plan created', data };
  }

  /** PATCH /membership-plans/:id — admin only: update plan */
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a membership plan (admin); priceKobo locked if active subscribers exist' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMembershipPlanDto,
  ) {
    const data = await this.service.update(id, dto);
    return { message: 'Plan updated', data };
  }

  /** POST /membership-plans/:id/subscribe — member subscribes */
  @Post(':id/subscribe')
  @Roles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Subscribe to a membership plan' })
  async subscribe(
    @Param('id', ParseUUIDPipe) planId: string,
    @GetCurrentUser('id') userId: string,
  ) {
    const data = await this.service.subscribe(userId, planId);
    return { message: 'Subscribed successfully', data };
  }

  /** DELETE /membership-plans/my-subscription — cancel subscription */
  @Delete('my-subscription')
  @Roles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel current subscription (remains active until period end)' })
  async cancelMySubscription(@GetCurrentUser('id') userId: string) {
    const data = await this.service.cancelMySubscription(userId);
    return { message: 'Subscription cancelled. Access continues until period end.', data };
  }
}