import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { RequestUser } from '../../auth/interfaces/authenticated-request.interface';
import { UserRole } from '../../auth/enums/user-role.enum';
import { RotateKeysDto } from '../dto/rotate-keys.dto';
import { KeyRotationService, KeyRotationSummary } from './key-rotation.service';

/**
 * Admin-only custodial key rotation (issue #1945). Re-wraps every
 * `wallet_key_material` row from an old `kmsKeyId` to a new one in bounded
 * batches. The run is resumable and idempotent, so a partial/interrupted
 * run is completed by calling the endpoint again with the same ids.
 */
@ApiTags('wallets')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('wallets/admin/key-rotation')
export class KeyRotationController {
  constructor(private readonly keyRotation: KeyRotationService) {}

  @Post()
  @HttpCode(200)
  @ApiOperation({
    summary: 'Admin-only: re-wrap wallet data keys from one KMS key to another',
    description:
      'Idempotent and resumable. Rows already on the new key are skipped, ' +
      'so a repeated or interrupted run never double-rotates.',
  })
  @ApiResponse({ status: 200, description: 'Rotation summary' })
  async rotate(
    @Body() dto: RotateKeysDto,
    @CurrentUser() currentUser: RequestUser,
  ): Promise<KeyRotationSummary> {
    return this.keyRotation.rotate({
      fromKeyId: dto.fromKeyId,
      toKeyId: dto.toKeyId,
      batchSize: dto.batchSize,
      maxBatches: dto.maxBatches,
      adminId: currentUser.id,
    });
  }
}
