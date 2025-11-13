import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { UserRole } from '../enums/userRoles.enum';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';

@Injectable()
export class UploadProfilePictureProvider {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async uploadProfilePicture(
    targetUserId: string,
    file: Express.Multer.File,
    currentUserId: string,
    currentUserRole: UserRole,
  ): Promise<{ id: string; profilePicture: string }> {
    if (currentUserId !== targetUserId && currentUserRole !== UserRole.ADMIN) {
      throw new BadRequestException(
        'You can only update your own profile picture',
      );
    }

    try {
      const targetUser = await this.usersRepository.findOne({
        where: { id: targetUserId },
      });
      if (!targetUser) {
        throw new BadRequestException('User not found');
      }

      const uploadResult: any = await this.cloudinaryService.uploadImage(
        file,
        'profile-pictures',
      );

      if (targetUser.profilePicture) {
        try {
          const publicId = this.cloudinaryService.extractPublicIdFromUrl(
            targetUser.profilePicture,
          );
          await this.cloudinaryService.deleteImage(publicId);
        } catch {}
      }

      targetUser.profilePicture = uploadResult.secure_url;
      const saved = await this.usersRepository.save(targetUser);

      return { id: saved.id, profilePicture: saved.profilePicture };
    } catch (error) {
      throw new BadRequestException('Failed to upload profile picture');
    }
  }
}
