import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssetAudit } from './entities/asset-audit.entity';
import { CreateAssetAuditDto } from './dto/create-asset-audit.dto';
import { UpdateAssetAuditDto } from './dto/update-asset-audit.dto';
import { AssetsService } from '../assets/assets.service';

@Injectable()
export class AssetAuditsService {
  constructor(
    @InjectRepository(AssetAudit) private readonly assetAuditRepository: Repository<AssetAudit>,
    private readonly assetsService: AssetsService,
  ) {}

  async create(createAssetAuditDto: CreateAssetAuditDto): Promise<AssetAudit> {
    const { assetId } = createAssetAuditDto;
    const asset = await this.assetsService.findOne(assetId);
    if (!asset) {
      throw new NotFoundException(`Asset with ID ${assetId} not found.`);
    }
    const assetAudit = this.assetAuditRepository.create({ ...createAssetAuditDto, asset });
    return this.assetAuditRepository.save(assetAudit);
  }

  async findAll(): Promise<AssetAudit[]> {
    return this.assetAuditRepository.find({ relations: ['asset'] });
  }

  async findOne(id: string): Promise<AssetAudit> {
    const assetAudit = await this.assetAuditRepository.findOne({ where: { id }, relations: ['asset'] });
    if (!assetAudit) {
      throw new NotFoundException(`Asset Audit with ID ${id} not found.`);
    }
    return assetAudit;
  }

  async update(id: string, updateAssetAuditDto: UpdateAssetAuditDto): Promise<AssetAudit> {
    const assetAudit = await this.findOne(id);
    const updated = Object.assign(assetAudit, updateAssetAuditDto);
    return this.assetAuditRepository.save(updated);
  }

  async remove(id: string): Promise<void> {
    const result = await this.assetAuditRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Asset Audit with ID ${id} not found.`);
    }
  }

  async getAuditedVsMissingReport(): Promise<any> {
    const totalAssets = await this.assetsService.countAll();
    const auditedAssets = await this.assetAuditRepository.count();
    
    const missingAssets = totalAssets - auditedAssets;

    return {
      totalAssets,
      auditedAssets,
      missingAssets,
      percentageAudited: totalAssets > 0 ? (auditedAssets / totalAssets) * 100 : 0,
      percentageMissing: totalAssets > 0 ? (missingAssets / totalAssets) * 100 : 0,
    };
  }
}
