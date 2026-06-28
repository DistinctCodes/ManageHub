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

  @Post('biometric/register/challenge')
  @Roles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Generate WebAuthn registration challenge' })
  async biometricRegisterChallenge(@GetCurrentUser('id') userId: string) {
    const data =
      await this.workspaceTrackingService.generateRegistrationChallenge(
        userId,
      );
    return { message: 'Registration challenge generated', data };
  }

  @Post('biometric/register/verify')
  @Roles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Verify and store WebAuthn credential' })
  async biometricRegisterVerify(
    @Body() body: { challenge: string; credentialId: string; credentialPublicKey: string },
    @GetCurrentUser('id') userId: string,
  ) {
    const data = await this.workspaceTrackingService.verifyRegistration(
      userId,
      body,
    );
    return { message: data.message, data };
  }

  @Post('biometric/check-in')
  @Roles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Biometric check-in using stored credential' })
  async biometricCheckIn(
    @Body() dto: CheckInDto & { credentialId: string },
    @GetCurrentUser('id') userId: string,
  ) {
    const data = await this.workspaceTrackingService.biometricCheckIn(
      dto,
      userId,
    );
    return { message: 'Biometric check-in successful', data };
  }

  @Post('biometric/check-out/:logId')
  @Roles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Biometric check-out using stored credential' })
  @HttpCode(HttpStatus.OK)
  async biometricCheckOut(
    @Param('logId', ParseUUIDPipe) logId: string,
    @Body() body: { credentialId: string },
    @GetCurrentUser('id') userId: string,
  ) {
    const data = await this.workspaceTrackingService.biometricCheckOut(
      logId,
      userId,
      body,
    );
    return { message: 'Biometric check-out successful', data };
  }
}
