import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../users/enums/userRoles.enum';

@Injectable()
export class UserProfileSeederService {
  private readonly logger = new Logger(UserProfileSeederService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async seedDemoProfiles(): Promise<void> {
    this.logger.log('Starting to seed demo user profiles...');

    const demoUsers = [
      {
        firstname: 'John',
        lastname: 'Doe',
        username: 'johndoe',
        email: 'john.doe@managehub.demo',
        phone: '+1234567890',
        role: UserRole.ADMIN,
        isVerified: true,
        profilePicture: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&crop=face',
        password: '$2b$10$kqYhJmEh4M8NOQx.LJ.Wr.iX5J8Z8VQD6rHJv2xmhMLvyrlzZGqtO', // password123
      },
      {
        firstname: 'Jane',
        lastname: 'Smith',
        username: 'janesmith',
        email: 'jane.smith@managehub.demo',
        phone: '+1987654321',
        role: UserRole.USER,
        isVerified: true,
        profilePicture: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=400&h=400&fit=crop&crop=face',
        password: '$2b$10$kqYhJmEh4M8NOQx.LJ.Wr.iX5J8Z8VQD6rHJv2xmhMLvyrlzZGqtO', // password123
      },
      {
        firstname: 'Michael',
        lastname: 'Johnson',
        username: 'michaelj',
        email: 'michael.johnson@managehub.demo',
        phone: '+1555123456',
        role: UserRole.USER,
        isVerified: true,
        profilePicture: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&crop=face',
        password: '$2b$10$kqYhJmEh4M8NOQx.LJ.Wr.iX5J8Z8VQD6rHJv2xmhMLvyrlzZGqtO', // password123
      },
      {
        firstname: 'Sarah',
        lastname: 'Williams',
        username: 'sarahw',
        email: 'sarah.williams@managehub.demo',
        phone: '+1444987654',
        role: UserRole.USER,
        isVerified: false,
        profilePicture: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=400&fit=crop&crop=face',
        password: '$2b$10$kqYhJmEh4M8NOQx.LJ.Wr.iX5J8Z8VQD6rHJv2xmhMLvyrlzZGqtO', // password123
      },
      {
        firstname: 'Robert',
        lastname: 'Brown',
        username: 'robbrown',
        email: 'robert.brown@managehub.demo',
        phone: '+1333456789',
        role: UserRole.USER,
        isVerified: true,
        profilePicture: null, // User without profile picture
        password: '$2b$10$kqYhJmEh4M8NOQx.LJ.Wr.iX5J8Z8VQD6rHJv2xmhMLvyrlzZGqtO', // password123
      },
      {
        firstname: 'Emily',
        lastname: 'Davis',
        username: 'emilyd',
        email: 'emily.davis@managehub.demo',
        phone: null, // User without phone
        role: UserRole.USER,
        isVerified: true,
        profilePicture: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&h=400&fit=crop&crop=face',
        password: '$2b$10$kqYhJmEh4M8NOQx.LJ.Wr.iX5J8Z8VQD6rHJv2xmhMLvyrlzZGqtO', // password123
      },
    ];

    for (const userData of demoUsers) {
      try {
        // Check if user already exists
        const existingUser = await this.userRepository.findOne({
          where: { email: userData.email },
        });

        if (existingUser) {
          this.logger.warn(`User with email ${userData.email} already exists, skipping...`);
          continue;
        }

        // Create new user with profile data
        const user = this.userRepository.create({
          ...userData,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        await this.userRepository.save(user);
        this.logger.log(`Created demo user: ${userData.firstname} ${userData.lastname} (${userData.email})`);
      } catch (error) {
        this.logger.error(`Failed to create user ${userData.email}:`, error.message);
      }
    }

    this.logger.log('Demo user profiles seeding completed!');
  }

  async clearDemoProfiles(): Promise<void> {
    this.logger.log('Clearing demo user profiles...');
    
    try {
      await this.userRepository.delete({
        email: {
          $like: '%@managehub.demo' as any,
        } as any,
      });
      
      // Alternative approach using query builder
      await this.userRepository
        .createQueryBuilder()
        .delete()
        .where('email LIKE :email', { email: '%@managehub.demo' })
        .execute();
        
      this.logger.log('Demo user profiles cleared successfully!');
    } catch (error) {
      this.logger.error('Failed to clear demo profiles:', error.message);
    }
  }

  async getDemoCredentials(): Promise<{ email: string; password: string; role: string }[]> {
    return [
      { email: 'john.doe@managehub.demo', password: 'password123', role: 'ADMIN' },
      { email: 'jane.smith@managehub.demo', password: 'password123', role: 'USER' },
      { email: 'michael.johnson@managehub.demo', password: 'password123', role: 'USER' },
      { email: 'sarah.williams@managehub.demo', password: 'password123', role: 'USER' },
      { email: 'robert.brown@managehub.demo', password: 'password123', role: 'USER' },
      { email: 'emily.davis@managehub.demo', password: 'password123', role: 'USER' },
    ];
  }
}