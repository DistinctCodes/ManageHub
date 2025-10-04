import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Asset } from '../assets/asset.entity';
import { Inventory } from '../inventory/inventory.entity';
import { SearchQueryDto } from './dto/search-query.dto';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Asset) private assetRepo: Repository<Asset>,
    @InjectRepository(Inventory) private inventoryRepo: Repository<Inventory>,
  ) {}

  async search(dto: SearchQueryDto) {
    const { category, supplier, branch, location, page, limit, sortBy, order } = dto;

    // Build query for assets
    let assetQuery = this.assetRepo
      .createQueryBuilder('asset')
      .leftJoinAndSelect('asset.category', 'category')
      .leftJoinAndSelect('asset.supplier', 'supplier')
      .leftJoinAndSelect('asset.branch', 'branch')
      .leftJoinAndSelect('asset.location', 'location');

    if (category) {
      assetQuery.andWhere('category.name ILIKE :category', { category: `%${category}%` });
    }
    if (supplier) {
      assetQuery.andWhere('supplier.name ILIKE :supplier', { supplier: `%${supplier}%` });
    }
    if (branch) {
      assetQuery.andWhere('branch.name ILIKE :branch', { branch: `%${branch}%` });
    }
    if (location) {
      assetQuery.andWhere('location.name ILIKE :location', { location: `%${location}%` });
    }

    if (sortBy) {
      assetQuery.orderBy(`asset.${sortBy}`, order || 'ASC');
    }

    assetQuery.skip((page - 1) * limit).take(limit);

    const [assets, totalAssets] = await assetQuery.getManyAndCount();

    // Build query for inventory
    let inventoryQuery = this.inventoryRepo
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.category', 'category')
      .leftJoinAndSelect('inventory.supplier', 'supplier')
      .leftJoinAndSelect('inventory.branch', 'branch')
      .leftJoinAndSelect('inventory.location', 'location');

    if (category) {
      inventoryQuery.andWhere('category.name ILIKE :category', { category: `%${category}%` });
    }
    if (supplier) {
      inventoryQuery.andWhere('supplier.name ILIKE :supplier', { supplier: `%${supplier}%` });
    }
    if (branch) {
      inventoryQuery.andWhere('branch.name ILIKE :branch', { branch: `%${branch}%` });
    }
    if (location) {
      inventoryQuery.andWhere('location.name ILIKE :location', { location: `%${location}%` });
    }

    if (sortBy) {
      inventoryQuery.orderBy(`inventory.${sortBy}`, order || 'ASC');
    }

    inventoryQuery.skip((page - 1) * limit).take(limit);

    const [inventories, totalInventories] = await inventoryQuery.getManyAndCount();

    return {
      assets: { data: assets, total: totalAssets },
      inventories: { data: inventories, total: totalInventories },
    };
  }
}
