import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { WorkspaceTrackingService } from './workspace-tracking.service';
import { CheckInDto } from './dto/check-in.dto';
import { OccupancyQueryDto } from './dto/occupancy-query.dto';
import { AttendanceQueryDto } from './dto/attendance-query.dto';
import { GetCurrentUser } from '../auth/decorators/getCurrentUser.decorator';
import { Roles } from '../auth/decorators/roles.decorators';
import { RolesGuard } from '../auth/guard/roles.guard';
import { UserRole } from '../users/enums/userRoles.enum';

@ApiTags('Workspace Tracking')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('workspace-tracking')
export class WorkspaceTrackingController {
  constructor(
    private readonly workspaceTrackingService: WorkspaceTrackingService,
  ) {}

  @Post('check-in')
  @Roles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Check into a workspace' })
  async checkIn(@Body() dto: CheckInDto, @GetCurrentUser('id') userId: string) {
    const data = await this.workspaceTrackingService.checkIn(dto, userId);
    return { message: 'Checked in successfully', data };
  }

  @Patch('check-out/:logId')
  @Roles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check out of a workspace' })
  async checkOut(
    @Param('logId', ParseUUIDPipe) logId: string,
    @GetCurrentUser('id') userId: string,
  ) {
    const data = await this.workspaceTrackingService.checkOut(logId, userId);
    return { message: 'Checked out successfully', data };
  }

  @Get('active')
  @Roles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get my current active check-in' })
  @ApiQuery({ name: 'workspaceId', required: false, type: String })
  async getActiveCheckIn(
    @GetCurrentUser('id') userId: string,
    @Query('workspaceId') workspaceId?: string,
  ) {
    const data = await this.workspaceTrackingService.getActiveCheckIn(
      userId,
      workspaceId,
    );
    return { message: 'Active check-in retrieved', data };
  }

  @Get('occupancy')
  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get current occupancy for all (or one) workspace' })
  @ApiQuery({ name: 'workspaceId', required: false, type: String })
  async getCurrentOccupancy(@Query('workspaceId') workspaceId?: string) {
    const data =
      await this.workspaceTrackingService.getCurrentOccupancy(workspaceId);
    return { message: 'Occupancy retrieved', data };
  }

  @Get('utilization')
  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get utilization statistics' })
  async getUtilizationStats(@Query() query: OccupancyQueryDto) {
    const data = await this.workspaceTrackingService.getUtilizationStats(query);
    return { message: 'Utilization stats retrieved', data };
  }

  @Get('logs')
  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get recent check-in logs' })
  @ApiQuery({ name: 'workspaceId', required: false, type: String })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getRecentLogs(
    @Query('workspaceId') workspaceId?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.workspaceTrackingService.getRecentLogs(
      workspaceId,
      limit ? Number(limit) : 50,
    );
    return { message: 'Recent logs retrieved', data };
  }

  // ── Attendance history endpoints ────────────────────────────────────────────

  @Get('attendance/my-history')
  @Roles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get my attendance history (paginated)',
    description:
      "Returns the authenticated member's check-in/out history with optional workspace and date filters.",
  })
  async getMyAttendanceHistory(
    @GetCurrentUser('id') userId: string,
    @Query() query: AttendanceQueryDto,
  ) {
    const data = await this.workspaceTrackingService.getMemberAttendanceHistory(
      userId,
      query,
    );
    return { message: 'Attendance history retrieved', data };
  }

  @Get('attendance/my-summary')
  @Roles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Get my attendance summary',
    description:
      'Returns aggregate stats: total sessions, total minutes, average session length, and distinct workspaces visited.',
  })
  async getMyAttendanceSummary(@GetCurrentUser('id') userId: string) {
    const data =
      await this.workspaceTrackingService.getMemberAttendanceSummary(userId);
    return { message: 'Attendance summary retrieved', data };
  }

  @Get('attendance/admin-report')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({
    summary: 'Admin: aggregate attendance report for all members',
    description:
      'Returns paginated check-in logs across all members. Supports workspace and date range filters.',
  })
  async getAdminAttendanceReport(@Query() query: AttendanceQueryDto) {
    const data =
      await this.workspaceTrackingService.getAdminAttendanceReport(query);
    return { message: 'Admin attendance report retrieved', data };
  }
}