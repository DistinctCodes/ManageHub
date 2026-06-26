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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { MembershipPlansService } from './membership-plans.service';
import { CreateMembershipPlanDto } from './dto/create-membership-plan.dto';
import { UpdateMembershipPlanDto } from './dto/update-membership-plan.dto';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { Public } from '../auth/decorators/public.decorator';
import { GetCurrentUserId } from '../auth/decorators/getCurrentUser.decorator';
import { UserRole } from '../users/enums/userRoles.enum';

@ApiTags('membership-plans')
@ApiBearerAuth()
@Controller('membership-plans')
export class MembershipPlansController {
  constructor(private readonly service: MembershipPlansService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a membership plan (Admin only)' })
  async create(@Body() dto: CreateMembershipPlanDto) {
    const data = await this.service.create(dto);
    return { message: 'Membership plan created successfully', data };
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'List active membership plans' })
  async findAll() {
    const data = await this.service.findAll();
    return { message: 'Membership plans retrieved successfully', data };
  }

  @Get('subscriptions/me')
  @ApiOperation({ summary: 'Get my active membership subscription' })
  async getMySubscription(@GetCurrentUserId() userId: string) {
    const data = await this.service.getMySubscription(userId);
    return { message: 'Subscription retrieved successfully', data };
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a membership plan by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.service.findById(id);
    return { message: 'Membership plan retrieved successfully', data };
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a membership plan (Admin only)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMembershipPlanDto,
  ) {
    const data = await this.service.update(id, dto);
    return { message: 'Membership plan updated successfully', data };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate a membership plan (Admin only)' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.service.remove(id);
  }

  @Post(':id/subscribe')
  @ApiOperation({ summary: 'Subscribe to a membership plan' })
  async subscribe(
    @Param('id', ParseUUIDPipe) id: string,
    @GetCurrentUserId() userId: string,
  ) {
    const data = await this.service.subscribe(id, userId);
    return { message: 'Subscribed successfully', data };
  }

  @Delete('subscriptions/me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel my active membership subscription' })
  async cancelSubscription(
    @GetCurrentUserId() userId: string,
  ): Promise<void> {
    await this.service.cancelSubscription(userId);
  }
}