import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryItem } from '../inventory-alerts/entities/inventory-item.entity';
import { InventoryAlertsService } from '../inventory-alerts/inventory-alerts.service';

@Injectable()
export class StockService {
  constructor(
    @InjectRepository(InventoryItem)
    private readonly itemsRepo: Repository<InventoryItem>,
    private readonly alertsService: InventoryAlertsService,
  ) {}

  async adjustStock(itemId: string, delta: number) {
    // atomic update
    await this.itemsRepo.createQueryBuilder()
      .update(InventoryItem)
      .set({ quantity: () => `"quantity" + (${delta})` })
      .where('id = :id', { id: itemId })
      .execute();

    // ensure fresh check
    await this.alertsService.checkItemThreshold(itemId);

    // return latest item
    return this.itemsRepo.findOne({ where: { id: itemId } });
  }
}
