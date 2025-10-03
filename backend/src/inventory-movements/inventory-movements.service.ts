import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InventoryItem } from './entities/inventory-item.entity';
import { InventoryMovement, MovementType } from './entities/inventory-movement.entity';
import { CreateInventoryMovementDto } from './dto/create-inventory-movement.dto';

@Injectable()
export class InventoryMovementsService {
  constructor(
    @InjectRepository(InventoryItem)
    private readonly itemRepo: Repository<InventoryItem>,
    @InjectRepository(InventoryMovement)
    private readonly movementRepo: Repository<InventoryMovement>,
    private readonly dataSource: DataSource,
  ) {}

  async createMovement(dto: CreateInventoryMovementDto): Promise<InventoryMovement> {
    return await this.dataSource.transaction(async manager => {
      const item = await manager.findOne(InventoryItem, { where: { id: dto.itemId } });
      if (!item) throw new BadRequestException('Item not found');

      if (dto.type === MovementType.OUT && item.stock < dto.quantity) {
        throw new BadRequestException('Insufficient stock');
      }

      // update stock
      item.stock += dto.type === MovementType.IN ? dto.quantity : -dto.quantity;
      await manager.save(item);

      // record movement
      const movement = manager.create(InventoryMovement, {
        item,
        type: dto.type,
        quantity: dto.quantity,
        initiatedBy: dto.initiatedBy,
      });
      return manager.save(movement);
    });
  }

  async findMovements(itemId?: string): Promise<InventoryMovement[]> {
    if (itemId) {
      return this.movementRepo.find({
        where: { item: { id: itemId } },
        order: { date: 'DESC' },
      });
    }
    return this.movementRepo.find({ order: { date: 'DESC' } });
  }
}
