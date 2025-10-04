import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from '../entities/asset.entity';
import { InventoryItem } from '../entities/inventory-item.entity';
import { UsageHistory } from '../entities/usage-history.entity';
import { Category } from '../entities/category.entity';
import { Department } from '../entities/department.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Asset) private readonly assetRepo: Repository<Asset>,
    @InjectRepository(InventoryItem) private readonly inventoryRepo: Repository<InventoryItem>,
    @InjectRepository(UsageHistory) private readonly usageRepo: Repository<UsageHistory>,
    @InjectRepository(Category) private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Department) private readonly departmentRepo: Repository<Department>,
  ) {}

  /**
   * Returns asset records filtered and joined with category & department names.
   */
  async getAssetsReport(filters: {
    startDate?: string;
    endDate?: string;
    categoryId?: string;
    departmentId?: string;
  }) {
    const qb = this.assetRepo.createQueryBuilder('asset')
      .leftJoinAndSelect('asset.category', 'category')
      .leftJoinAndSelect('asset.department', 'department');

    if (filters.categoryId) qb.andWhere('category.id = :categoryId', { categoryId: filters.categoryId });
    if (filters.departmentId) qb.andWhere('department.id = :departmentId', { departmentId: filters.departmentId });
    if (filters.startDate) qb.andWhere('asset.createdAt >= :startDate', { startDate: filters.startDate });
    if (filters.endDate) qb.andWhere('asset.createdAt <= :endDate', { endDate: filters.endDate });

    const assets = await qb.orderBy('asset.createdAt', 'DESC').getMany();

    // Map to flat objects for export
    return assets.map(a => ({
      id: a.id,
      name: a.name,
      serialNumber: a.serialNumber ?? '',
      model: a.model ?? '',
      category: a.category?.name ?? '',
      department: a.department?.name ?? '',
      createdAt: a.createdAt?.toISOString(),
      metadata: JSON.stringify(a.metadata ?? {}),
    }));
  }

  /**
   * Returns inventory items with quantities and category/department names
   */
  async getInventoryReport(filters: {
    startDate?: string;
    endDate?: string;
    categoryId?: string;
    departmentId?: string;
  }) {
    const qb = this.inventoryRepo.createQueryBuilder('inv')
      .leftJoinAndSelect('inv.category', 'category')
      .leftJoinAndSelect('inv.department', 'department');

    if (filters.categoryId) qb.andWhere('category.id = :categoryId', { categoryId: filters.categoryId });
    if (filters.departmentId) qb.andWhere('department.id = :departmentId', { departmentId: filters.departmentId });
    if (filters.startDate) qb.andWhere('inv.createdAt >= :startDate', { startDate: filters.startDate });
    if (filters.endDate) qb.andWhere('inv.createdAt <= :endDate', { endDate: filters.endDate });

    const items = await qb.orderBy('inv.createdAt', 'DESC').getMany();

    return items.map(i => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      category: i.category?.name ?? '',
      department: i.department?.name ?? '',
      createdAt: i.createdAt?.toISOString(),
      metadata: JSON.stringify(i.metadata ?? {}),
    }));
  }

  /**
   * Usage history report; can include asset & inventory references.
   */
  async getUsageReport(filters: {
    startDate?: string;
    endDate?: string;
    categoryId?: string; // optional: filter by category of related asset/inventory
    departmentId?: string;
  }) {
    // Basic query that fetches usage history with related asset/inventory and department
    const qb = this.usageRepo.createQueryBuilder('u')
      .leftJoinAndSelect('u.asset', 'asset')
      .leftJoinAndSelect('u.inventoryItem', 'inventoryItem')
      .leftJoinAndSelect('u.department', 'department');

    if (filters.departmentId) qb.andWhere('department.id = :departmentId', { departmentId: filters.departmentId });
    if (filters.startDate) qb.andWhere('u.performedAt >= :startDate', { startDate: filters.startDate });
    if (filters.endDate) qb.andWhere('u.performedAt <= :endDate', { endDate: filters.endDate });

    // If categoryId is provided, filter either asset.category or inventoryItem.category
    if (filters.categoryId) {
      qb.leftJoin('asset.category', 'assetCategory')
        .leftJoin('inventoryItem.category', 'invCategory')
        .andWhere('(assetCategory.id = :catId OR invCategory.id = :catId)', { catId: filters.categoryId });
    }

    const histories = await qb.orderBy('u.performedAt', 'DESC').getMany();

    return histories.map(h => ({
      id: h.id,
      action: h.action,
      assetId: h.asset?.id ?? '',
      assetName: h.asset?.name ?? '',
      inventoryItemId: h.inventoryItem?.id ?? '',
      inventoryItemName: h.inventoryItem?.name ?? '',
      department: h.department?.name ?? '',
      performedBy: h.performedBy ?? '',
      performedAt: h.performedAt?.toISOString(),
      meta: JSON.stringify(h.meta ?? {}),
    }));
  }
}
