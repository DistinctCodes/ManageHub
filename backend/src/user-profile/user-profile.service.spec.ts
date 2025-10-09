import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { UserProfileService } from './user-profile.service';
import { User } from '../users/entities/user.entity';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

describe('UserProfileService', () => {
  let service: UserProfileService;
  let userRepository: jest.Mocked<Repository<User>>;
  let cloudinaryService: jest.Mocked<CloudinaryService>;

  const mockUser: Partial<User> = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    firstname: 'John',
    lastname: 'Doe',
    username: 'johndoe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    profilePicture: 'https://cloudinary.com/image.jpg',
    isVerified: true,
    isActive: true,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserProfileService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: CloudinaryService,
          useValue: {
            uploadImage: jest.fn(),
            deleteImage: jest.fn(),
            extractPublicIdFromUrl: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserProfileService>(UserProfileService);
    userRepository = module.get(getRepositoryToken(User));
    cloudinaryService = module.get(CloudinaryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserProfile', () => {
    it('should return user profile successfully', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as User);

      const result = await service.getUserProfile(mockUser.id);

      expect(result).toEqual({
        id: mockUser.id,
        firstname: mockUser.firstname,
        lastname: mockUser.lastname,
        username: mockUser.username,
        email: mockUser.email,
        phone: mockUser.phone,
        profilePicture: mockUser.profilePicture,
        isVerified: mockUser.isVerified,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserProfile('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateProfile', () => {
    const updateDto: UpdateProfileDto = {
      firstname: 'Jane',
      lastname: 'Smith',
      phone: '+0987654321',
    };

    it('should update profile successfully', async () => {
      const updatedUser = { ...mockUser, ...updateDto };
      userRepository.findOne.mockResolvedValue(mockUser as User);
      userRepository.save.mockResolvedValue(updatedUser as User);

      const result = await service.updateProfile(mockUser.id, updateDto);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Profile updated successfully');
      expect(result.data.firstname).toBe(updateDto.firstname);
    });

    it('should throw ConflictException when email already exists', async () => {
      const existingUser = { ...mockUser, id: 'different-id' };
      userRepository.findOne
        .mockResolvedValueOnce(mockUser as User) // First call for user lookup
        .mockResolvedValueOnce(existingUser as User); // Second call for email check

      await expect(
        service.updateProfile(mockUser.id, { email: 'existing@example.com' })
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.updateProfile('invalid-id', updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('uploadAvatar', () => {
    const mockFile = {
      buffer: Buffer.from('test'),
      mimetype: 'image/jpeg',
      size: 1024 * 1024, // 1MB
    } as Express.Multer.File;

    it('should upload avatar successfully', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as User);
      cloudinaryService.uploadImage.mockResolvedValue({
        secure_url: 'https://cloudinary.com/new-image.jpg',
      } as any);
      userRepository.save.mockResolvedValue(mockUser as User);

      const result = await service.uploadAvatar(mockUser.id, mockFile);

      expect(result.success).toBe(true);
      expect(result.data.profilePicture).toBe('https://cloudinary.com/new-image.jpg');
    });

    it('should throw BadRequestException for invalid file type', async () => {
      const invalidFile = { ...mockFile, mimetype: 'application/pdf' };

      await expect(service.uploadAvatar(mockUser.id, invalidFile)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for file too large', async () => {
      const largeFile = { ...mockFile, size: 6 * 1024 * 1024 }; // 6MB

      await expect(service.uploadAvatar(mockUser.id, largeFile)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when no file provided', async () => {
      await expect(service.uploadAvatar(mockUser.id, null)).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeAvatar', () => {
    it('should remove avatar successfully', async () => {
      userRepository.findOne.mockResolvedValue(mockUser as User);
      cloudinaryService.extractPublicIdFromUrl.mockReturnValue('profile-pictures/image_id');
      cloudinaryService.deleteImage.mockResolvedValue({ result: 'ok' });
      userRepository.save.mockResolvedValue({ ...mockUser, profilePicture: null } as User);

      const result = await service.removeAvatar(mockUser.id);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Profile picture removed successfully');
    });

    it('should throw BadRequestException when user has no profile picture', async () => {
      const userWithoutPicture = { ...mockUser, profilePicture: null };
      userRepository.findOne.mockResolvedValue(userWithoutPicture as User);

      await expect(service.removeAvatar(mockUser.id)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.removeAvatar('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });
});