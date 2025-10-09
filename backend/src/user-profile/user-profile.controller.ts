import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { UserProfileService } from './user-profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { GetCurrentUser } from '../auth/decorators/getCurrentUser.decorator';
import { FileValidationPipe } from '../common/pipes/file-validation.pipe';

@ApiTags('User Profile')
@ApiBearerAuth()
@Controller('profile')
export class UserProfileController {
  constructor(private readonly userProfileService: UserProfileService) {}

  @Get()
  @ApiOperation({ 
    summary: 'Get current user profile',
    description: 'Retrieve the authenticated user\'s profile information'
  })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        firstname: { type: 'string' },
        lastname: { type: 'string' },
        username: { type: 'string', nullable: true },
        email: { type: 'string', format: 'email' },
        phone: { type: 'string', nullable: true },
        profilePicture: { type: 'string', nullable: true },
        isVerified: { type: 'boolean' },
        createdAt: { type: 'string', format: 'date-time' },
        updatedAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getProfile(@GetCurrentUser('id') userId: string) {
    return this.userProfileService.getUserProfile(userId);
  }

  @Patch()
  @ApiOperation({ 
    summary: 'Update user profile',
    description: 'Update the authenticated user\'s profile information'
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            firstname: { type: 'string' },
            lastname: { type: 'string' },
            username: { type: 'string', nullable: true },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string', nullable: true },
            profilePicture: { type: 'string', nullable: true },
            isVerified: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  @ApiResponse({ status: 409, description: 'Conflict - Email or username already exists' })
  async updateProfile(
    @GetCurrentUser('id') userId: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.userProfileService.updateProfile(userId, updateProfileDto);
  }

  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ 
    summary: 'Upload user avatar',
    description: 'Upload a new profile picture for the authenticated user'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Profile picture file (JPEG, JPG, PNG, WebP - Max 5MB)',
    required: true,
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file for profile picture',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Avatar uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            profilePicture: { type: 'string', format: 'uri' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid file or file too large' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async uploadAvatar(
    @GetCurrentUser('id') userId: string,
    @UploadedFile(new FileValidationPipe()) file: Express.Multer.File,
  ) {
    return this.userProfileService.uploadAvatar(userId, file);
  }

  @Delete('avatar')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Remove user avatar',
    description: 'Remove the authenticated user\'s profile picture'
  })
  @ApiResponse({
    status: 200,
    description: 'Avatar removed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Bad request - User does not have a profile picture' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async removeAvatar(@GetCurrentUser('id') userId: string) {
    return this.userProfileService.removeAvatar(userId);
  }
}