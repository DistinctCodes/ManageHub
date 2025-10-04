import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileUpload } from './file-uploads.entity';
import { CreateFileUploadDto } from './dto/create-file-upload.dto';

@Injectable()
export class FileUploadsService {
  constructor(
    @InjectRepository(FileUpload)
    private readonly repo: Repository<FileUpload>,
  ) {}

  async create(file: Express.Multer.File, dto: CreateFileUploadDto) {
    const entity = this.repo.create({
      filename: file.filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      path: (file as any).path || (file as any).location || null,
      relatedType: dto.relatedType,
      relatedId: dto.relatedId,
    });

    return this.repo.save(entity);
  }

  async findOne(id: string) {
    const file = await this.repo.findOne({ where: { id } });
    if (!file) throw new NotFoundException('File not found');
    return file;
  }

  async remove(id: string) {
    const file = await this.findOne(id);
    return this.repo.remove(file);
  }

  async link(id: string, relatedType?: string, relatedId?: string) {
    const file = await this.findOne(id);
    file.relatedType = relatedType ?? file.relatedType;
    file.relatedId = relatedId ?? file.relatedId;
    return this.repo.save(file);
  }
}
