import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guard/jwt.auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from '../users/enums/userRoles.enum';
import { CurrentUser } from '../auth/decorators/current.user.decorators';
import { User } from '../users/entities/user.entity';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { GetCurrentUser } from 'src/auth/decorators/getCurrentUser.decorator';
import { MemberDashboardProvider } from './providers/member-dashboard.provide';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly memberDashboardProvider: MemberDashboardProvider,
  ) {}

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  async getStats(@CurrentUser() user: User) {
    const data = await this.dashboardService.getUserStats(user.id);
    return { success: true, data };
  }

  @Get('activity')
  @HttpCode(HttpStatus.OK)
  async getActivity() {
    const data = await this.dashboardService.getActivity();
    return { success: true, data };
  }

  @Get('admin/stats')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getAdminStats() {
    const data = await this.dashboardService.getAdminStats();
    return { success: true, data };
  }

  @Get('admin/users')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async getAdminUsers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @Query('search') search?: string,
  ) {
    const data = await this.dashboardService.getUsers(
      Math.max(1, parseInt(page, 10) || 1),
      Math.min(50, Math.max(1, parseInt(limit, 10) || 10)),
      search,
    );
    return { success: true, ...data };
  }

  // ──────────────────────────────────────────────
  // Member endpoints
  // ──────────────────────────────────────────────

  @Get('member')
  @HttpCode(HttpStatus.OK)
  async getMemberDashboard(@GetCurrentUser('id') userId: string) {
    const data = await this.memberDashboardProvider.getMemberDashboard(userId);
    return { success: true, data };
  }

  @Get('member/bookings')
  @HttpCode(HttpStatus.OK)
  async getMemberBookings(
    @GetCurrentUser('id') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    const data = await this.dashboardService.getMemberBookings(
      userId,
      parsedPage,
      parsedLimit,
    );
    return { success: true, ...data };
  }

  @Get('member/payments')
  @HttpCode(HttpStatus.OK)
  async getMemberPayments(
    @GetCurrentUser('id') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    const data = await this.dashboardService.getMemberPayments(
      userId,
      parsedPage,
      parsedLimit,
    );
    return { success: true, ...data };
  }

  @Get('member/invoices')
  @HttpCode(HttpStatus.OK)
  async getMemberInvoices(
    @GetCurrentUser('id') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const parsedPage = Math.max(1, parseInt(page, 10) || 1);
    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    const data = await this.dashboardService.getMemberInvoices(
      userId,
      parsedPage,
      parsedLimit,
    );
    return { success: true, ...data };
  }
}
