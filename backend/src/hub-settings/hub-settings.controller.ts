import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HubSettingsService } from './hub-settings.service';
import { UpdateHubSettingsDto } from './dto/update-hub-settings.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorators';
import { RolesGuard } from '../auth/guard/roles.guard';
import { UserRole } from '../users/enums/userRoles.enum';

@ApiTags('Hub Settings')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('hub-settings')
export class HubSettingsController {
  constructor(private readonly service: HubSettingsService) {}

  /**
   * GET /hub-settings — public, no auth required.
   * Needed for white-labeling (FE-38) on every page load.
   */
  @Get()
  @Public()
  @ApiOperation({ summary: 'Get hub settings (public — used for white-labeling)' })
  async getSettings() {
    const data = await this.service.getSettings();
    return { message: 'Hub settings retrieved', data };
  }

  /**
   * PATCH /hub-settings — super_admin only.
   * Partial update; validates timezone against IANA list.
   */
  @Patch()
  @Roles(UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update hub settings (super_admin only)' })
  async updateSettings(@Body() dto: UpdateHubSettingsDto) {
    const data = await this.service.updateSettings(dto);
    return { message: 'Hub settings updated', data };
  }
}