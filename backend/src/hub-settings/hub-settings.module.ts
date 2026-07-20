import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HubSettings } from './entities/hub-settings.entity';
import { HubSettingsService } from './hub-settings.service';
import { HubSettingsController } from './hub-settings.controller';

@Module({
  imports: [TypeOrmModule.forFeature([HubSettings])],
  controllers: [HubSettingsController],
  providers: [HubSettingsService],
  exports: [HubSettingsService],
})
export class HubSettingsModule {}