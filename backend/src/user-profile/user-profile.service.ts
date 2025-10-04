import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { ProfileResponse, ProfileUpdateResponse, AvatarUploadResponse } from './interfaces/profile-response.interface';

@Injectable()
export class UserProfileService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async getUserProfile(userId: string): Promise<ProfileResponse> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isActive: true, isDeleted: false },
      select: [
        'id',
        'firstname',
        'lastname',
        'username',
        'email',
        'phone',
        'profilePicture',
        'isVerified',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      firstname: user.firstname,
      lastname: user.lastname,
      username: user.username,
      email: user.email,
      phone: user.phone,
      profilePicture: user.profilePicture,
      isVerified: user.isVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<ProfileUpdateResponse> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isActive: true, isDeleted: false },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if email is being updated and if it's already taken by another user
    if (updateProfileDto.email && updateProfileDto.email !== user.email) {
      const existingUserWithEmail = await this.userRepository.findOne({
        where: { email: updateProfileDto.email },
      });

      if (existingUserWithEmail && existingUserWithEmail.id !== userId) {
        throw new ConflictException('Email is already in use by another user');
      }
    }

    // Check if username is being updated and if it's already taken by another user
    if (updateProfileDto.username && updateProfileDto.username !== user.username) {
      const existingUserWithUsername = await this.userRepository.findOne({
        where: { username: updateProfileDto.username },
      });

      if (existingUserWithUsername && existingUserWithUsername.id !== userId) {
        throw new ConflictException('Username is already taken');
      }
    }

    // Update user properties
    Object.assign(user, updateProfileDto);
    
    const updatedUser = await this.userRepository.save(user);

    const profileResponse: ProfileResponse = {
      id: updatedUser.id,
      firstname: updatedUser.firstname,
      lastname: updatedUser.lastname,
      username: updatedUser.username,
      email: updatedUser.email,
      phone: updatedUser.phone,
      profilePicture: updatedUser.profilePicture,
      isVerified: updatedUser.isVerified,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };

    return {
      success: true,
      message: 'Profile updated successfully',
      data: profileResponse,
    };
  }

  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<AvatarUploadResponse> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Validate file type
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Invalid file type. Only JPEG, JPG, PNG, and WebP files are allowed');
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size too large. Maximum size is 5MB');
    }

    const user = await this.userRepository.findOne({
      where: { id: userId, isActive: true, isDeleted: false },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      // Delete existing profile picture if it exists
      if (user.profilePicture) {
        try {
          const publicId = this.cloudinaryService.extractPublicIdFromUrl(user.profilePicture);
          await this.cloudinaryService.deleteImage(publicId);
        } catch (error) {
          // Log error but don't fail the upload
          console.warn('Failed to delete existing profile picture:', error);
        }
      }

      // Upload new image to Cloudinary
      const uploadResult = await this.cloudinaryService.uploadImage(file, 'profile-pictures');
      
      if (!uploadResult || !uploadResult.secure_url) {
        throw new BadRequestException('Failed to upload image');
      }

      // Update user's profile picture URL
      user.profilePicture = uploadResult.secure_url;
      await this.userRepository.save(user);

      return {
        success: true,
        message: 'Profile picture updated successfully',
        data: {
          profilePicture: uploadResult.secure_url,
        },
      };
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to upload profile picture');
    }
  }

  async removeAvatar(userId: string): Promise<{ success: boolean; message: string }> {
    const user = await this.userRepository.findOne({
      where: { id: userId, isActive: true, isDeleted: false },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.profilePicture) {
      throw new BadRequestException('User does not have a profile picture');
    }

    try {
      // Delete image from Cloudinary
      const publicId = this.cloudinaryService.extractPublicIdFromUrl(user.profilePicture);
      await this.cloudinaryService.deleteImage(publicId);

      // Remove profile picture URL from user
      user.profilePicture = null;
      await this.userRepository.save(user);

      return {
        success: true,
        message: 'Profile picture removed successfully',
      };
    } catch (error) {
      throw new BadRequestException('Failed to remove profile picture');
    }
  }
}