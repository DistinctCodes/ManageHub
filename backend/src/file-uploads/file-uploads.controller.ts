import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Body,
  Get,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { FileUploadsService } from './file-uploads.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { multerOptions } from './multer.provider';
import { CreateFileUploadDto } from './dto/create-file-upload.dto';

@Controller('file-uploads')
export class FileUploadsController {
  constructor(private readonly service: FileUploadsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateFileUploadDto,
  ) {
    return this.service.create(file, dto);
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id/link')
  async link(
    @Param('id') id: string,
    @Body() dto: import('./dto/link-file.dto').LinkFileDto,
  ) {
    return this.service.link(id, dto.relatedType, dto.relatedId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
  }
}
