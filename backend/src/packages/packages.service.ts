import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Package } from './entities/package.entity';
import { CreatePackageDto } from './dto/create-package.dto';
import { PackageStatus } from './enums/package-status.enum';

@Injectable()
export class PackagesService {
  constructor(
    @InjectRepository(Package)
    private readonly repo: Repository<Package>,
  ) {}

  async create(dto: CreatePackageDto, staffId: string): Promise<Package> {
    const pkg = this.repo.create({
      ...dto,
      loggedByStaffId: staffId,
      arrivedAt: dto.arrivedAt ? new Date(dto.arrivedAt) : new Date(),
    });
    return this.repo.save(pkg);
  }

  async findMine(userId: string) {
    return this.repo.find({
      where: { recipientUserId: userId },
      order: { arrivedAt: 'DESC' },
    });
  }

  async findAll(status?: PackageStatus) {
    const where = status ? { status } : {};
    return this.repo.find({ where, order: { arrivedAt: 'DESC' }, relations: ['recipient'] });
  }

  async findOne(id: string): Promise<Package> {
    const pkg = await this.repo.findOne({ where: { id } });
    if (!pkg) throw new NotFoundException(`Package ${id} not found`);
    return pkg;
  }

  async collect(id: string): Promise<Package> {
    const pkg = await this.findOne(id);
    pkg.status = PackageStatus.COLLECTED;
    pkg.collectedAt = new Date();
    return this.repo.save(pkg);
  }

  async returnToSender(id: string): Promise<Package> {
    const pkg = await this.findOne(id);
    pkg.status = PackageStatus.RETURNED;
    return this.repo.save(pkg);
  }
}
