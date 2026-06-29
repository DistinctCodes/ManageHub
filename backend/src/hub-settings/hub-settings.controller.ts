import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
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

  // ── Branding sub-routes ────────────────────────────────────────────────

  @Get('branding')
  @Public()
  @ApiOperation({ summary: 'Get hub branding config (public)' })
  @ApiResponse({ status: 200, description: 'Branding config retrieved.' })
  getBranding() {
    return this.hubSettingsService.getBranding();
  }

  @Patch('branding')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update hub branding (Admin only)' })
  @ApiResponse({ status: 200, description: 'Branding updated.' })
  updateBranding(@Body() dto: UpdateHubSettingsDto) {
    return this.hubSettingsService.updateSettings(dto);
  }

  @Post('branding/upload-logo')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload hub logo (Admin only)' })
  async uploadLogo(@UploadedFile() file: Express.Multer.File) {
    const url = await this.hubSettingsService.uploadBrandAsset(file, 'hub-logos');
    await this.hubSettingsService.updateSettings({ logoUrl: url });
    return { success: true, data: { logoUrl: url } };
  }

  @Post('branding/upload-favicon')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @UseGuards(RolesGuard)
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload hub favicon (Admin only)' })
  async uploadFavicon(@UploadedFile() file: Express.Multer.File) {
    const url = await this.hubSettingsService.uploadBrandAsset(file, 'hub-favicons');
    await this.hubSettingsService.updateSettings({ faviconUrl: url });
    return { success: true, data: { faviconUrl: url } };
  }
}
