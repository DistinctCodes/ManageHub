import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThan, LessThanOrEqual } from 'typeorm';
import { InventoryItem } from './entities/inventory-item.entity';
import { Alert } from './entities/alert.entity';

@Injectable()
export class InventoryAlertsService {
  private readonly logger = new Logger(InventoryAlertsService.name);

  constructor(
    @InjectRepository(InventoryItem)
    private readonly itemsRepo: Repository<InventoryItem>,
    @InjectRepository(Alert)
    private readonly alertsRepo: Repository<Alert>,
  ) {}

  /**
   * Checks single item by id and creates/resolves alerts as necessary.
   */
  async checkItemThreshold(itemId: string): Promise<Alert | null> {
    const item = await this.itemsRepo.findOne({ where: { id: itemId } });
    if (!item) return null;

    const currentQuantity = Number(item.quantity ?? 0);
    const threshold = Number(item.threshold ?? 0);

    if (currentQuantity <= threshold) {
      // create or update unresolved alert
      const existing = await this.alertsRepo.findOne({ where: { item: { id: item.id }, type: 'low_stock', resolved: false } });
      if (existing) {
        existing.currentQuantity = currentQuantity;
        existing.threshold = threshold;
        return this.alertsRepo.save(existing);
      } else {
        const a = this.alertsRepo.create({
          item,
          sku: item.sku,
          itemName: item.name,
          currentQuantity,
          threshold,
          type: 'low_stock',
          resolved: false,
          source: 'system',
        });
        return this.alertsRepo.save(a);
      }
    } else {
      // resolve any existing unresolved alerts for this item
      const unresolved = await this.alertsRepo.find({ where: { item: { id: item.id }, resolved: false } });
      if (unresolved.length) {
        for (const u of unresolved) {
          u.resolved = true;
          u.resolvedAt = new Date();
          await this.alertsRepo.save(u);
        }
      }
      return null;
    }
  }

  /**
   * Scans all inventory items and upserts/resolves alerts accordingly.
   */
  async checkAllThresholds(): Promise<Alert[]> {
    // find all items currently low
    const lowItems = await this.itemsRepo.find({ where: { quantity: LessThanOrEqual(() => '"threshold"' as any) } as any }); // fallback
    // NOTE: TypeORM doesn't support comparing columns easily in all DBs; fallback below: fetch all and filter in JS if necessary
    if (lowItems.length === 0) {
      // fallback to full scan (safe)
      const all = await this.itemsRepo.find();
      const low = all.filter((i) => Number(i.quantity ?? 0) <= Number(i.threshold ?? 0));
      const results = [];
      for (const item of low) {
        results.push(await this.checkItemThreshold(item.id));
      }
      // also resolve alerts for items now above threshold
      const above = all.filter((i) => Number(i.quantity ?? 0) > Number(i.threshold ?? 0));
      const aboveIds = above.map((i) => i.id);
      if (aboveIds.length) {
        await this.alertsRepo.createQueryBuilder()
          .update(Alert)
          .set({ resolved: true, resolvedAt: () => 'CURRENT_TIMESTAMP' })
          .where('item_id IN (:...ids) AND resolved = false', { ids: aboveIds })
          .execute();
      }
      return results.filter(Boolean) as Alert[];
    }

    const results = [];
    for (const item of lowItems) {
      results.push(await this.checkItemThreshold(item.id));
    }
    // resolve others
    const all = await this.itemsRepo.find();
    const above = all.filter((i) => Number(i.quantity ?? 0) > Number(i.threshold ?? 0));
    const aboveIds = above.map((i) => i.id);
    if (aboveIds.length) {
      await this.alertsRepo.createQueryBuilder()
        .update(Alert)
        .set({ resolved: true, resolvedAt: () => 'CURRENT_TIMESTAMP' })
        .where('item_id IN (:...ids) AND resolved = false', { ids: aboveIds })
        .execute();
    }
    return results.filter(Boolean) as Alert[];
  }

  /**
   * Fetch alerts with pagination and optional resolved filter.
   */
  async getAlerts(opts: { resolved?: boolean; skip?: number; limit?: number; itemId?: string } = {}) {
    const { resolved, skip = 0, limit = 50, itemId } = opts;
    const qb = this.alertsRepo.createQueryBuilder('a')
      .leftJoinAndSelect('a.item', 'item')
      .orderBy('a.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (typeof resolved === 'boolean') qb.andWhere('a.resolved = :resolved', { resolved });
    if (itemId) qb.andWhere('item.id = :itemId', { itemId });

    const [alerts, total] = await qb.getManyAndCount();
    return { total, alerts };
  }
}
