import {
  Controller,
  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  ParseUUIDPipe,
  HttpCode,
  Patch,
  Body,
  Delete,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './providers/users.service';
import { GetCurrentUser } from '../auth/decorators/getCurrentUser.decorator';
import { UserRole } from './enums/userRoles.enum';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UpdateUserDto } from './dto/updateUser.dto';
import { OnboardingStatusProvider } from './providers/onboarding-status.provider';
import { DataExportProvider } from './providers/data-export.provider';
import { AccountErasureProvider } from './providers/account-erasure.provider';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly onboardingStatusProvider: OnboardingStatusProvider,
    private readonly dataExportProvider: DataExportProvider,
    private readonly accountErasureProvider: AccountErasureProvider,
  ) {}

  @Post(':id/profile-picture')
  @ApiOperation({ summary: 'Upload user profile picture' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  async uploadProfilePicture(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @GetCurrentUser('id') currentUserId: string,
    @GetCurrentUser('role') currentUserRole: UserRole,
  ) {
    this.logger.log(`Uploading profile picture for user ${id}`);
    const result = await this.usersService.uploadUserProfilePicture(
      id,
      file,
      currentUserId,
      currentUserRole,
    );
    this.logger.log(`Profile picture updated for user ${id}`);
    return {
      message: 'Profile picture updated successfully',
      data: result,
    };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: { token: string; newPassword: string }) {
    return this.usersService.resetPassword(body.token, body.newPassword);
  }

  /**
   * GET /users/onboarding/status
   *
   * Returns the onboarding checklist for the currently authenticated user.
   * Computed on-the-fly from existing data - no new DB table required.
   */
  @Get('onboarding/status')
  @ApiOperation({ summary: 'Get onboarding checklist status for current user' })
  async getOnboardingStatus(@GetCurrentUser('id') userId: string) {
    const status = await this.onboardingStatusProvider.getStatus(userId);
    return {
      message: 'Onboarding status retrieved successfully',
      data: status,
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.findOnePublicById(id);
    return {
      message: 'User retrieved successfully',
      data: user,
    };
  }

  // GET /users
  @Get()
  async findAll() {
    const users = await this.usersService.findAllUsers();
    return { success: true, data: users };
  }

  // PATCH /users/:id
  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateData: UpdateUserDto,
  ) {
    const user = await this.usersService.updateUser(id, updateData);
    return {
      success: true,
      message: `User ${id} updated successfully`,
      data: user,
    };
  }

  // DELETE /users/:id
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', new ParseUUIDPipe()) id: string) {
    await this.usersService.deleteUser(id);
    return;
  }

  // POST /users/me/data-export
  @Post('me/data-export')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Request GDPR data export' })
  async requestDataExport(@GetCurrentUser('id') userId: string) {
    this.logger.log(`Data export requested for user ${userId}`);
    const userData = await this.dataExportProvider.gatherUserData(userId);
    return {
      message:
        'Data export request accepted. You will receive an email with the download link.',
      data: userData,
    };
  }

  // DELETE /users/me/account
  @Delete('me/account')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request account deletion (GDPR right to erasure)' })
  async requestAccountDeletion(@GetCurrentUser('id') userId: string) {
    this.logger.log(`Account deletion requested for user ${userId}`);
    const result = await this.accountErasureProvider.anonymizeUser(userId);
    return result;
  }
}
