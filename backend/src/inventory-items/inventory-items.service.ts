import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryItem } from './inventory-items.entity';
import { StockMovement, StockMovementType } from './stock-movement.entity';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';

@Injectable()
export class InventoryItemsService {
  constructor(
    @InjectRepository(InventoryItem)
    private inventoryItemsRepository: Repository<InventoryItem>,
    @InjectRepository(StockMovement)
    private stockMovementRepository: Repository<StockMovement>,
  ) {}

  create(createInventoryItemDto: CreateInventoryItemDto): Promise<InventoryItem> {
    const inventoryItem = this.inventoryItemsRepository.create(createInventoryItemDto);
    return this.inventoryItemsRepository.save(inventoryItem);
  }

  async findAll(): Promise<InventoryItem[]> {
    return await this.inventoryItemsRepository.find({
      relations: ['stockMovements'],
    });
  }

  async findOne(id: number): Promise<InventoryItem> {
    const inventoryItem = await this.inventoryItemsRepository.findOne({ 
      where: { id },
      relations: ['stockMovements'],
    });
    if (!inventoryItem) {
      throw new NotFoundException(`Inventory item with ID ${id} not found`);
    }
    return inventoryItem;
  }

  async update(id: number, updateInventoryItemDto: UpdateInventoryItemDto): Promise<InventoryItem> {
    const inventoryItem = await this.findOne(id);
    Object.assign(inventoryItem, updateInventoryItemDto);
    return await this.inventoryItemsRepository.save(inventoryItem);
  }

  async remove(id: number): Promise<void> {
    const inventoryItem = await this.findOne(id);
    await this.inventoryItemsRepository.remove(inventoryItem);
  }

  // Method to handle stock updates with movement tracking
  async updateStock(id: number, quantity: number, reason?: string): Promise<InventoryItem> {
    const inventoryItem = await this.findOne(id);
    const difference = quantity - inventoryItem.quantity;
    
    // If no change in quantity, avoid recording a redundant movement
    if (difference === 0) {
      return inventoryItem;
    }
    
    // Create stock movement record
    const movement = new StockMovement();
    movement.inventoryItem = inventoryItem;
    movement.quantity = Math.abs(difference);
    movement.reason = reason;
    
    if (difference > 0) {
      movement.type = StockMovementType.IN;
    } else {
      movement.type = StockMovementType.OUT;
    }
    
    await this.stockMovementRepository.save(movement);
    
    // Update the inventory item
    inventoryItem.quantity = quantity;
    return await this.inventoryItemsRepository.save(inventoryItem);
  }

  // Method to add stock
  async addStock(id: number, quantity: number, reason?: string): Promise<InventoryItem> {
    const inventoryItem = await this.findOne(id);
    return this.updateStock(id, inventoryItem.quantity + quantity, reason || 'Stock added');
  }

  // Method to remove stock
  async removeStock(id: number, quantity: number, reason?: string): Promise<InventoryItem> {
    const inventoryItem = await this.findOne(id);
    
    if (inventoryItem.quantity < quantity) {
      throw new BadRequestException('Insufficient stock');
    }
    
    return this.updateStock(id, inventoryItem.quantity - quantity, reason || 'Stock removed');
  }

  // Method to check if stock is below reorder level
  async checkReorderLevel(id: number): Promise<boolean> {
    const inventoryItem = await this.findOne(id);
    return inventoryItem.quantity <= inventoryItem.reorderLevel;
  }

  // Get stock movements for an item
  async getStockMovements(inventoryItemId: number): Promise<StockMovement[]> {
    return await this.stockMovementRepository.find({
      where: { inventoryItem: { id: inventoryItemId } },
      order: { createdAt: 'DESC' },
    });
  }
}