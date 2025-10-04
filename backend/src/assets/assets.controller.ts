import {
  Controller,
  Post,
  Param,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerOptions } from '../file-uploads/multer.provider';
import { FileUploadsService } from '../file-uploads/file-uploads.service';
import { AssetsService } from './assets.service';

@Controller('assets')
export class AssetsController {
  constructor(
    private readonly assetsService: AssetsService,
    private readonly fileUploadsService: FileUploadsService,
  ) {}

  @Post(':id/uploads')
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async uploadForAsset(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const dto = { relatedType: 'asset', relatedId: id };
    return this.fileUploadsService.create(file, dto as any);
  }
}
