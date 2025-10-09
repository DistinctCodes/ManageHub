import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryItemsService } from './inventory-items.service';
import { InventoryItemsController } from './inventory-items.controller';
import { InventoryItem } from './inventory-items.entity';
import { StockMovement } from './stock-movement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryItem, StockMovement])],
  controllers: [InventoryItemsController],
  providers: [InventoryItemsService],
  exports: [InventoryItemsService],
})
export class InventoryItemsModule {}