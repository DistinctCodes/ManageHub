import {
  Controller,

  Post,
  Get,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { FileValidationPipe } from '../common/pipes/file-validation.pipe';
import { UsersService } from './providers/users.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { GetCurrentUser } from '../auth/decorators/getCurrentUser.decorator';
import { UserRole } from './enums/userRoles.enum';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';

import { UpdateUserDto } from './dto/updateUser.dto';


@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {

  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService,
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
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  async uploadProfilePicture(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(new FileValidationPipe()) file: Express.Multer.File,
    @GetCurrentUser() currentUser: any,
  ) {
    this.logger.log(`Uploading profile picture for user ${id}`);
    if (currentUser.id !== id && currentUser.role !== UserRole.ADMIN) {
      throw new BadRequestException('You can only update your own profile picture');
    }
    try {
      // Upload to Cloudinary
      const result = await this.cloudinaryService.uploadImage(file, 'profile-pictures');
      // Delete old profile picture if exists
      const userWithOldPicture = await this.usersService.findOneById(id);
      if (userWithOldPicture.profilePicture) {
        try {
          const publicId = this.cloudinaryService.extractPublicIdFromUrl(userWithOldPicture.profilePicture);
          await this.cloudinaryService.deleteImage(publicId);
        } catch (error) {
          this.logger.error('Failed to delete old profile picture:', error.message);
        }
      }
      // Update user with new profile picture URL
      const updatedUser = await this.usersService.updateProfilePicture(id, result.secure_url);
      this.logger.log(`Profile picture updated for user ${id}`);
      return {
        message: 'Profile picture updated successfully',
        data: {
          id: updatedUser.id,
          profilePicture: updatedUser.profilePicture,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to upload profile picture: ${error.message}`);
      throw new BadRequestException('Failed to upload profile picture');
    }
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const user = await this.usersService.findOneById(id);
    // Don't return sensitive information
    const { password, passwordResetToken, ...userWithoutSensitiveData } = user;
    return {
      message: 'User retrieved successfully',
      data: userWithoutSensitiveData,
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
}
