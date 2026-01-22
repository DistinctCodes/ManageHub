import { Injectable } from '@nestjs/common';
import { Buffer } from 'buffer';
import * as sharp from 'sharp';

@Injectable()
export class ImageProcessorService {
  async optimize(file: Express.Multer.File): Promise<Buffer> {
    if (!file.mimetype.startsWith('image/')) return file.buffer;
    return sharp(file.buffer)
      .resize({ width: 1024 })
      .webp({ quality: 80 })
      .toBuffer();
  }
}
