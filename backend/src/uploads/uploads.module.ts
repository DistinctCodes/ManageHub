// uploads.module.ts
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { UploadsController } from './uploads.controller';
// import { UploadsService } from './uploads.service';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UploadsService } from './provider/uploads.service';

@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: './uploads', // Local folder
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  ],
  controllers: [UploadsController],
  providers: [UploadsService],
})
export class UploadsModule {}
