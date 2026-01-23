import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ImageProcessorService } from './processors/image-processor.service';
import { v4 as uuidv4 } from 'uuid';
import { VirusScannerService } from './processors/virus-scanner.service';
import { S3StorageService } from './storage/s3-storage.service';

@Injectable()
export class FilesService {
  constructor(
    private readonly s3: S3StorageService,
    // private readonly local: LocalStorageService,
    private readonly imageProcessor: ImageProcessorService,
    private readonly virusScanner: VirusScannerService,
  ) {}

  async uploadFile(file: Express.Multer.File) {
    await this.virusScanner.scan(file.buffer);
    const optimizedBuffer = await this.imageProcessor.optimize(file);
    const fileId = uuidv4();
    const result = await this.s3.upload(fileId, optimizedBuffer, file.mimetype);
    return { id: fileId, url: result, originalName: file.originalname };
  }

  async uploadMultipleFiles(files: Express.Multer.File[]) {
    const results = [];
    for (const file of files) {
      results.push(await this.uploadFile(file));
    }
    return results;
  }

  async getFileMetadata(fileId: string) {
    return this.s3.getMetadata(fileId);
  }

  async getFileStream(fileId: string) {
    const meta = await this.getFileMetadata(fileId);
    const stream = await this.s3.getStream(fileId);
    return { stream, filename: meta.originalName, mimeType: meta.mimeType };
  }

  async deleteFile(fileId: string) {
    return this.s3.delete(fileId);
  }
}
