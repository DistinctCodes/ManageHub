import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from './assets.entity';

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(Asset) private readonly assetRepository: Repository<Asset>,
  ) {}

  async create(asset: Partial<Asset>): Promise<Asset> {
    const newAsset = this.assetRepository.create(asset);
    return this.assetRepository.save(newAsset);
  }

  async findAll(): Promise<Asset[]> {
    return this.assetRepository.find();
  }

  async findOne(id: string): Promise<Asset> {
    const asset = await this.assetRepository.findOne({ where: { id } });
    if (!asset) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }
    return asset;
  }

  async update(id: string, asset: Partial<Asset>): Promise<Asset> {
    await this.assetRepository.update(id, asset);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    const result = await this.assetRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Asset with ID ${id} not found`);
    }
  }

  async countAll(): Promise<number> {
    return this.assetRepository.count();
  }
}