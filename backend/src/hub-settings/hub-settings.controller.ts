import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { HubSettingsService } from './hub-settings.service';
import { UpdateHubSettingsDto } from './dto/update-hub-settings.dto';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorators';
import { RolesGuard } from '../auth/guard/roles.guard';
import { UserRole } from '../users/enums/userRoles.enum';

@ApiTags('Hub Settings')
@Controller('hub-settings')
export class HubSettingsController {
  constructor(private readonly hubSettingsService: HubSettingsService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get current hub configuration (public)' })
  @ApiResponse({ status: 200, description: 'Hub settings retrieved successfully.' })
  getSettings() {
    return this.hubSettingsService.getSettings();
  }

  @Patch()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update hub configuration (Admin / Super-admin only)' })
  @ApiResponse({ status: 200, description: 'Hub settings updated successfully.' })
  updateSettings(@Body() updateHubSettingsDto: UpdateHubSettingsDto) {
    return this.hubSettingsService.updateSettings(updateHubSettingsDto);
  }
}
