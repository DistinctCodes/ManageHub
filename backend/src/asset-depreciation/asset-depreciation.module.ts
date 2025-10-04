import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetDepreciationController } from './asset-depreciation.controller';
import { AssetDepreciationService } from './providers/asset-depreciation.service';
import { Asset } from './entities/asset.entity';
import { CalculateDepreciationProvider } from './providers/calculate-depreciation.provider';

@Module({
  imports: [TypeOrmModule.forFeature([Asset])],
  controllers: [AssetDepreciationController],
  providers: [
    AssetDepreciationService,
    CalculateDepreciationProvider,
  ],
  exports: [AssetDepreciationService],
})
export class AssetDepreciationModule {}