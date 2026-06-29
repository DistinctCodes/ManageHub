import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AccessIntegration } from './entities/access-integration.entity';
import { AccessCredential } from './entities/access-credential.entity';
import { DoorAccessService } from './door-access.service';
import { DoorAccessController } from './door-access.controller';
import { KisiProvider } from './providers/kisi.provider';
import { BrivoProvider } from './providers/brivo.provider';

@Module({
  imports: [
    TypeOrmModule.forFeature([AccessIntegration, AccessCredential]),
    ConfigModule,
  ],
  controllers: [DoorAccessController],
  providers: [DoorAccessService, KisiProvider, BrivoProvider],
  exports: [DoorAccessService],
})
export class DoorAccessModule {}
