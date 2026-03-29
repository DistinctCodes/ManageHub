import { Module } from '@nestjs/common';
import { AdminModeratorAccountSettingsController } from './admin-moderator-account-settings.controller';
import { AdminModeratorAccountSettingsService } from './admin-moderator-account-settings.service';

@Module({
  controllers: [AdminModeratorAccountSettingsController],
  providers: [AdminModeratorAccountSettingsService],
})
export class AdminModeratorAccountSettingsModule {}
