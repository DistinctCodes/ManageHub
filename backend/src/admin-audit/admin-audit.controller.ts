import {
  BadRequestException,
  Controller,
  Get,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProduces,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Readable } from 'stream';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RequestUser } from '../auth/interfaces/authenticated-request.interface';
import { UserRole } from '../auth/enums/user-role.enum';
import { AdminActionLogService } from './admin-action-log.service';
import { AdminActionLogResponseDto } from './dto/admin-action-log.response.dto';
import { AdminActionType } from './admin-action-type.enum';
import {
  ADMIN_AUDIT_EXPORT_MAX_ROWS,
  exportAdminAuditToCsv,
  parseAuditDate,
} from './admin-audit-export.util';

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

  @Get('actions/export')
  @ApiProduces('text/csv')
  @ApiOperation({
    summary: 'Export recorded admin actions as CSV',
    description:
      `Streams the same rows as GET /admin/audit/actions as a CSV file, ` +
      `optionally narrowed to an inclusive [from, to] date range and/or a ` +
      `single action type. Capped at ${ADMIN_AUDIT_EXPORT_MAX_ROWS} rows, ` +
      `newest first. The export itself is recorded as an audit event.`,
  })
  @ApiQuery({ name: 'from', required: false, description: 'Inclusive ISO start' })
  @ApiQuery({ name: 'to', required: false, description: 'Inclusive ISO end' })
  @ApiQuery({
    name: 'action',
    required: false,
    enum: AdminActionType,
  })
  async export(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('action') action?: AdminActionType,
    @CurrentUser() currentUser?: RequestUser,
  ): Promise<StreamableFile> {
    let fromDate: Date | undefined;
    let toDate: Date | undefined;
    try {
      if (from) {
        fromDate = parseAuditDate(from, 'from');
      }
      if (to) {
        toDate = parseAuditDate(to, 'to');
      }
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid date range',
      );
    }
    if (fromDate && toDate && fromDate > toDate) {
      throw new BadRequestException(
        '"from" must be earlier than or equal to "to"',
      );
    }

    const logs = await this.audit.listForExport({
      from: fromDate,
      to: toDate,
      action,
      limit: ADMIN_AUDIT_EXPORT_MAX_ROWS,
    });
    const csv = exportAdminAuditToCsv(logs);

    if (currentUser) {
      await this.audit.record({
        actorId: currentUser.id,
        action: AdminActionType.AUDIT_EXPORT,
        targetType: 'AdminActionLog',
        detail: `exported=${logs.length}`,
      });
    }

    return new StreamableFile(Readable.from([csv]), {
      type: 'text/csv',
      disposition: 'attachment; filename="admin-audit-export.csv"',
    });
  }
}
