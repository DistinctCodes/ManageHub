import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';
import { S3StorageService } from './storage/s3-storage.service';
import { ImageProcessorService } from './processors/image-processor.service';
import { VirusScannerService } from './processors/virus-scanner.service';

@Module({
  controllers: [FilesController],
  providers: [
    FilesService,
    S3StorageService,
    // LocalStorageService,
    ImageProcessorService,
    VirusScannerService,
  ],
  exports: [FilesService],
})
export class FilesModule {}
