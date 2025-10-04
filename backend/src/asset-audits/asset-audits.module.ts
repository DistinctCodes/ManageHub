import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetAudit } from './entities/asset-audit.entity';
import { AssetAuditsService } from './asset-audits.service';
import { AssetAuditsController } from './asset-audits.controller';
import { AssetsModule } from '../assets/assets.module';

@Module({
  imports: [TypeOrmModule.forFeature([AssetAudit]), AssetsModule],
  providers: [AssetAuditsService],
  controllers: [AssetAuditsController],
})
export class AssetAuditsModule {}
