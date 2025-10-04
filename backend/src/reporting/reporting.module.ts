import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { Asset } from '../entities/asset.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { UsageHistory } from '../entities/usage-history.entity';
import { Category } from '../entities/category.entity';
import { Department } from '../entities/department.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Asset, InventoryItem, UsageHistory, Category, Department]),
  ],
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportsModule {}
