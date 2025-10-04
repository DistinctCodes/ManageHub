import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AssetDisposal } from './entities/asset-disposal.entity';
import { CreateAssetDisposalDto } from './dto/create-asset-disposal.dto';
import { Asset } from 'src/assets/assets.entity';

@Injectable()
export class AssetDisposalsService {
  constructor(
    @InjectRepository(AssetDisposal)
    private disposalRepo: Repository<AssetDisposal>,
    @InjectRepository(Asset)
    private assetRepo: Repository<Asset>,
  ) {}

  async disposeAsset(dto: CreateAssetDisposalDto): Promise<AssetDisposal> {
    const asset = await this.assetRepo.findOne({ where: { id: Number(dto.assetId) } });

    if (!asset) throw new NotFoundException('Asset not found');
    if (asset.status === 'disposed')
      throw new BadRequestException('Asset already disposed');

    // Create disposal record
    const disposal = this.disposalRepo.create({
      disposalDate: new Date(dto.disposalDate),
      method: dto.method,
      reason: dto.reason,
      approvedBy: dto.approvedBy,
    });
    await this.disposalRepo.save(disposal);

    // Update asset status
    asset.status = 'disposed';
    await this.assetRepo.save(asset);

    return disposal;
  }
}
