import {
    Controller,
    Post,
    UploadedFiles,
    UseInterceptors,
    Get,
    Param,
    Res,
    BadRequestException,
  } from '@nestjs/common';
  import {
    FilesInterceptor,
  } from '@nestjs/platform-express';
  import { diskStorage } from 'multer';
  import { Response } from 'express';
//   import { UploadsService } from './uploads.service';
  import { imageFileFilter } from './helpers/file-filter.helper';
//   import { UploadedFileDto } from './dto/uploaded-file.dto';
  import { extname } from 'path';
  import { v4 as uuidv4 } from 'uuid';
import { UploadsService } from './provider/uploads.service';
import { UploadedFileDto } from './dto/Uploaded.file.dto';
  
  @Controller('upload')
  export class UploadsController {
    constructor(private readonly uploadsService: UploadsService) {}
  
    @Post('image')
    @UseInterceptors(
      FilesInterceptor('images', 5, {
        storage: diskStorage({
          destination: './uploads',
          filename: (req, file, cb) => {
            const uniqueSuffix = `${uuidv4()}${extname(file.originalname)}`;
            cb(null, uniqueSuffix);
          },
        }),
        fileFilter: imageFileFilter,
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
      }),
    )
    async uploadImages(
      @UploadedFiles() files: Express.Multer.File[],
    ): Promise<UploadedFileDto[]> {
      if (!files || files.length === 0) {
        throw new BadRequestException('No files uploaded');
      }
      return this.uploadsService.saveMetadata(files);
    }
  
    @Get(':filename')
    async serveFile(@Param('filename') filename: string, @Res() res: Response) {
      const filePath = this.uploadsService.getFileStream(filename);
      return res.sendFile(filePath, { root: './uploads' });
    }
  }
  