import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssetMaintenance } from './asset-maintenence.entity';
import { Asset } from 'src/assets/assets.entity';
import { AssetMaintenanceService } from './asset-maintenance.service';
import { AssetMaintenanceController } from './asset-maintenance.controller';

@Module({
  imports: [TypeOrmModule.forFeature([AssetMaintenance, Asset])],
  providers: [AssetMaintenanceService],
  controllers: [AssetMaintenanceController],
})
export class AssetMaintenanceModule {}
