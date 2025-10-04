#!/usr/bin/env node

/**
 * Simple CLI script to manage demo data
 * Usage: node scripts/demo-data.js [seed|clear|info]
 */

const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/app.module');

async function main() {
  const command = process.argv[2];
  
  if (!command || !['seed', 'clear', 'info'].includes(command)) {
    console.log('Usage: node scripts/demo-data.js [seed|clear|info]');
    console.log('');
    console.log('Commands:');
    console.log('  seed  - Create demo user profiles');
    console.log('  clear - Remove demo user profiles');
    console.log('  info  - Show demo user credentials');
    process.exit(1);
  }

  try {
    console.log('🚀 Starting ManageHub application...');
    const app = await NestFactory.createApplicationContext(AppModule);
    const { UserProfileSeederService } = require('../dist/user-profile/user-profile-seeder.service');
    const seederService = app.get(UserProfileSeederService);

    switch (command) {
      case 'seed':
        console.log('🌱 Seeding demo user profiles...');
        await seederService.seedDemoProfiles();
        const credentials = await seederService.getDemoCredentials();
        
        console.log('\n✅ Demo profiles created successfully!');
        console.log('\n📋 Demo User Credentials:');
        console.log('================================');
        
        credentials.forEach((cred, index) => {
          console.log(`${index + 1}. Email: ${cred.email}`);
          console.log(`   Password: ${cred.password}`);
          console.log(`   Role: ${cred.role}`);
          console.log('   ─────────────────────');
        });
        
        console.log('\n💡 You can now test the profile management features!');
        console.log('🚀 Start server: npm run start:dev');
        console.log('📖 API docs: http://localhost:6000/swagger');
        break;

      case 'clear':
        console.log('🗑️  Clearing demo user profiles...');
        await seederService.clearDemoProfiles();
        console.log('✅ Demo profiles cleared successfully!');
        break;

      case 'info':
        const creds = await seederService.getDemoCredentials();
        console.log('\n📋 Demo User Credentials:');
        console.log('================================');
        
        creds.forEach((cred, index) => {
          console.log(`${index + 1}. Email: ${cred.email}`);
          console.log(`   Password: ${cred.password}`);
          console.log(`   Role: ${cred.role}`);
          console.log('   ─────────────────────');
        });
        
        console.log('\n💡 Use these credentials to test profile features!');
        break;
    }

    await app.close();
    console.log('\n🎉 Operation completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();