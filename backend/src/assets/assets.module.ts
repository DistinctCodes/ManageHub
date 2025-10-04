import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { Asset } from './assets.entity';
import { AssetsService } from './assets.service';
import { AssetsController } from './assets.controller';
import { FileUploadsService } from '../file-uploads/file-uploads.service';

@Module({
  imports: [TypeOrmModule.forFeature([Asset])],
  providers: [AssetsService, FileUploadsService],
  controllers: [AssetsController],
  exports: [AssetsService], // Export AssetsService
})
export class AssetsModule {}
