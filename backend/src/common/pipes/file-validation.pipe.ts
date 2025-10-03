import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class FileValidationPipe implements PipeTransform {
  private readonly allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  private readonly maxSize: number;

  constructor(maxSize: number = 5 * 1024 * 1024) { // 5MB default
    this.maxSize = maxSize;
  }

  transform(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type. Allowed types: ${this.allowedMimeTypes.join(', ')}`,
      );
    }

    // Validate file size
    if (file.size > this.maxSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.maxSize / (1024 * 1024)}MB`,
      );
    }

    return file;
  }
}
