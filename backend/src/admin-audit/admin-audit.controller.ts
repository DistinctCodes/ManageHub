import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/enums/user-role.enum';
import { AdminActionLogService } from './admin-action-log.service';
import { AdminActionLogResponseDto } from './dto/admin-action-log.response.dto';
import { AdminActionType } from './admin-action-type.enum';

/**
 * Read-only surface for the structured admin action audit trail. Every
 * recorded action (settlement batch execute/retry/abandon, split activation,
 * manual payment resolution/void) is reviewable here.
 */
@ApiTags('admin-audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/audit')
export class AdminAuditController {
  constructor(private readonly audit: AdminActionLogService) {}

  @Get('actions')
  @ApiOperation({
    summary: 'List recorded admin actions, newest first',
    description:
      'Optionally filter to a single action type. Every row captures the ' +
      'acting admin, the targeted entity, and a human detail where one was ' +
      'required.',
  })
  async list(
    @Query('action') action?: AdminActionType,
  ): Promise<AdminActionLogResponseDto[]> {
    const logs = await this.audit.list(action);
    return logs.map((log) => AdminActionLogResponseDto.fromEntity(log));
  }
}
