import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileUpload } from './file-uploads.entity';
import { FileUploadsService } from './file-uploads.service';
import { FileUploadsController } from './file-uploads.controller';

@Module({
  imports: [TypeOrmModule.forFeature([FileUpload])],
  providers: [FileUploadsService],
  controllers: [FileUploadsController],
  exports: [FileUploadsService],
})
export class FileUploadsModule {}
