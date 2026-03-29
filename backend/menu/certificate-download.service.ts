import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCertificateDownloadDto } from './dto/create-certificate-download.dto';
import { UpdateCertificateDownloadDto } from './dto/update-certificate-download.dto';

@Injectable()
export class CertificateDownloadService {
  private readonly items: Array<{ id: string } & CreateCertificateDownloadDto> = [];

  findAll() {
    return this.items;
  }

  findOne(id: string) {
    const item = this.items.find((entry) => entry.id === id);
    if (!item) {
      throw new NotFoundException('CertificateDownload item not found');
    }
    return item;
  }

  create(payload: CreateCertificateDownloadDto) {
    const created = { id: crypto.randomUUID(), ...payload };
    this.items.push(created);
    return created;
  }

  update(id: string, payload: UpdateCertificateDownloadDto) {
    const item = this.findOne(id);
    Object.assign(item, payload);
    return item;
  }

  remove(id: string) {
    const index = this.items.findIndex((entry) => entry.id === id);
    if (index === -1) {
      throw new NotFoundException('CertificateDownload item not found');
    }
    this.items.splice(index, 1);
    return { id, deleted: true };
  }
}
