// uploads.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
// import { UploadedFileEntity } from './entities/uploaded-file.entity';
import { Repository } from 'typeorm';
import { UploadedFileDto } from '../dto/Uploaded.file.dto';
import { UploadedFileEntity } from '../uploaded-file.entity';
// import { UploadedFileDto } from './dto/uploaded-file.dto';

@Injectable()
export class UploadsService {
  constructor(
    @InjectRepository(UploadedFileEntity)
    private fileRepo: Repository<UploadedFileEntity>,
  ) {}

  async saveMetadata(files: Express.Multer.File[]): Promise<UploadedFileDto[]> {
    const entries = files.map(file => {
      const entity = new UploadedFileEntity();
      entity.filename = file.filename;
      entity.path = file.path;
      entity.mimetype = file.mimetype;
      entity.size = file.size;
      return entity;
    });

    const saved = await this.fileRepo.save(entries);
    return saved.map(file => this.toDto(file));
  }

  getFileStream(filename: string): string {
    return filename;
  }

  private toDto(entity: UploadedFileEntity): UploadedFileDto {
    const { id, filename, path, mimetype, size, uploadedAt } = entity;
    return { id, filename, path, mimetype, size, uploadedAt };
  }
}
