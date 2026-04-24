import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WaitlistEntry } from './entities/waitlist-entry.entity';
import { User } from '../../users/entities/user.entity';
import { Workspace } from '../../workspaces/entities/workspace.entity';
import { WaitlistController } from './waitlist.controller';
import { WaitlistProvider } from './providers/waitlist.provider';
import { EmailModule } from '../../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WaitlistEntry, User, Workspace]),
    EmailModule,
  ],
  controllers: [WaitlistController],
  providers: [WaitlistProvider],
  exports: [WaitlistProvider],
})
export class WaitlistModule {}
