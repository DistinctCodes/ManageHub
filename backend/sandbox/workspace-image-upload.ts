import {
  Controller, Post, Param, UseGuards, UseInterceptors,
  UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { RolesGuard } from '../src/auth/guard/roles.guard';
import { Roles } from '../src/auth/decorators/roles.decorators';
import { UserRole } from '../src/users/enums/userRoles.enum';
import { CloudinaryService } from '../src/cloudinary/cloudinary.service';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

@Controller('sandbox/workspaces')
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class WorkspaceImageUploadController {
  constructor(private readonly cloudinary: CloudinaryService) {}

  @Post(':id/images')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_SIZE },
    }),
  )
  async uploadImage(
    @Param('id') workspaceId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Image file is required');

    if (!ALLOWED_MIME.includes(file.mimetype))
      throw new BadRequestException('Only jpg, png, and webp files are allowed');

    if (file.size > MAX_SIZE)
      throw new BadRequestException('File size must not exceed 5MB');

    const result = await this.cloudinary.uploadImage(file, `workspaces/${workspaceId}`);

    if ('error' in result) throw new BadRequestException('Upload failed');

    return { url: (result as any).secure_url };
  }
}
