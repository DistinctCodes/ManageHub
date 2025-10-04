import { Controller, Post, Delete, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { UserProfileSeederService } from '../user-profile/user-profile-seeder.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/userRoles.enum';

@ApiTags('Admin - Demo Data')
@ApiBearerAuth()
@Controller('admin/demo')
export class DemoDataController {
  constructor(
    private readonly userProfileSeederService: UserProfileSeederService,
  ) {}

  @Post('profiles/seed')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Seed demo user profiles',
    description: 'Creates demo user accounts with profile data for testing purposes. Admin only.'
  })
  @ApiResponse({
    status: 201,
    description: 'Demo profiles created successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            usersCreated: { type: 'number' },
            credentials: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  email: { type: 'string' },
                  password: { type: 'string' },
                  role: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async seedDemoProfiles() {
    await this.userProfileSeederService.seedDemoProfiles();
    const credentials = await this.userProfileSeederService.getDemoCredentials();

    return {
      success: true,
      message: 'Demo user profiles seeded successfully',
      data: {
        usersCreated: credentials.length,
        credentials: credentials,
        note: 'These are demo accounts for testing. All passwords are "password123"',
      },
    };
  }

  @Delete('profiles')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ 
    summary: 'Clear demo user profiles',
    description: 'Removes all demo user accounts from the database. Admin only.'
  })
  @ApiResponse({
    status: 200,
    description: 'Demo profiles cleared successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async clearDemoProfiles() {
    await this.userProfileSeederService.clearDemoProfiles();

    return {
      success: true,
      message: 'Demo user profiles cleared successfully',
    };
  }

  @Get('profiles/credentials')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ 
    summary: 'Get demo user credentials',
    description: 'Returns login credentials for all demo users. Admin only.'
  })
  @ApiResponse({
    status: 200,
    description: 'Demo credentials retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              email: { type: 'string' },
              password: { type: 'string' },
              role: { type: 'string' },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin access required' })
  async getDemoCredentials() {
    const credentials = await this.userProfileSeederService.getDemoCredentials();

    return {
      success: true,
      message: 'Demo credentials retrieved successfully',
      data: credentials,
    };
  }
}