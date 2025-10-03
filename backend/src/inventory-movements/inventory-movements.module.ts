import { Module } from '@nestjs/common';
import { InventoryMovementsController } from './inventory-movements.controller';
import { InventoryMovementsService } from './inventory-movements.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryItem } from './entities/inventory-item.entity';
import { InventoryMovement } from './entities/inventory-movement.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryItem, InventoryMovement])],
  controllers: [InventoryMovementsController],
  providers: [InventoryMovementsService]
})
export class InventoryMovementsModule {}
