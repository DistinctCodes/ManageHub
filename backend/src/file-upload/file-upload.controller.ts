import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FileUploadService } from './file-upload.service';

@Controller('file-upload')
export class FileUploadController {
  constructor(private readonly fileUploadService: FileUploadService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('No file provided');
    const isSafe = await this.fileUploadService.scanMalware(file.buffer);
    if (!isSafe) throw new BadRequestException('Malware detected');
    return { status: 'success', message: 'File is clean' };
  }
}
