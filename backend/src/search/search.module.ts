import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { Asset } from '../assets/asset.entity';
import { Inventory } from '../inventory/inventory.entity';
import { Category } from '../categories/category.entity';
import { Supplier } from '../suppliers/supplier.entity';
import { Branch } from '../branches/branch.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Asset, Inventory, Category, Supplier, Branch]),
  ],
  providers: [SearchService],
  controllers: [SearchController],
})
export class SearchModule {}
