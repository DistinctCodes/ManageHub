import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetDisposalsService } from './asset-disposals.service';
import { AssetDisposalsController } from './asset-disposals.controller';
import { AssetDisposal } from './entities/asset-disposal.entity';
import { Asset } from 'src/assets/assets.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AssetDisposal, Asset])],
  controllers: [AssetDisposalsController],
  providers: [AssetDisposalsService],
})
export class AssetDisposalsModule {}
