import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryItem } from './entities/inventory-item.entity';
import { Alert } from './entities/alert.entity';
import { InventoryAlertsService } from './inventory-alerts.service';
import { InventoryAlertsController } from './controllers/inventory-alerts.controller';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryItem, Alert])],
  providers: [InventoryAlertsService],
  controllers: [InventoryAlertsController],
  exports: [InventoryAlertsService],
})
export class InventoryAlertsModule {}
