import { Injectable } from '@nestjs/common';
import { Command } from 'nestjs-command';
import { UserProfileSeederService } from '../user-profile/user-profile-seeder.service';
import { Logger } from '@nestjs/common';

@Injectable()
export class SeedCommand {
  private readonly logger = new Logger(SeedCommand.name);

  constructor(
    private readonly userProfileSeederService: UserProfileSeederService,
  ) {}

  @Command({
    command: 'seed:profiles',
    describe: 'Seed demo user profiles for testing',
  })
  async seedProfiles() {
    try {
      this.logger.log('🌱 Starting to seed demo user profiles...');
      await this.userProfileSeederService.seedDemoProfiles();
      
      const credentials = await this.userProfileSeederService.getDemoCredentials();
      
      this.logger.log('\n✅ Demo profiles seeded successfully!');
      this.logger.log('\n📋 Demo User Credentials:');
      this.logger.log('================================');
      
      credentials.forEach((cred, index) => {
        this.logger.log(`${index + 1}. Email: ${cred.email}`);
        this.logger.log(`   Password: ${cred.password}`);
        this.logger.log(`   Role: ${cred.role}`);
        this.logger.log('   ─────────────────────');
      });
      
      this.logger.log('\n💡 You can now test the profile management features with these accounts!');
      this.logger.log('🚀 Start the server with: npm run start:dev');
      this.logger.log('📖 API docs available at: http://localhost:6000/swagger');
      
    } catch (error) {
      this.logger.error('❌ Failed to seed demo profiles:', error.message);
      process.exit(1);
    }
  }

  @Command({
    command: 'seed:profiles:clear',
    describe: 'Clear demo user profiles',
  })
  async clearProfiles() {
    try {
      this.logger.log('🗑️  Clearing demo user profiles...');
      await this.userProfileSeederService.clearDemoProfiles();
      this.logger.log('✅ Demo profiles cleared successfully!');
    } catch (error) {
      this.logger.error('❌ Failed to clear demo profiles:', error.message);
      process.exit(1);
    }
  }

  @Command({
    command: 'seed:profiles:info',
    describe: 'Display demo user credentials',
  })
  async showCredentials() {
    try {
      const credentials = await this.userProfileSeederService.getDemoCredentials();
      
      this.logger.log('\n📋 Demo User Credentials:');
      this.logger.log('================================');
      
      credentials.forEach((cred, index) => {
        this.logger.log(`${index + 1}. Email: ${cred.email}`);
        this.logger.log(`   Password: ${cred.password}`);
        this.logger.log(`   Role: ${cred.role}`);
        this.logger.log('   ─────────────────────');
      });
      
      this.logger.log('\n💡 Use these credentials to test profile management features!');
      
    } catch (error) {
      this.logger.error('❌ Failed to retrieve credentials:', error.message);
      process.exit(1);
    }
  }
}