import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, BadRequestException } from '@nestjs/common';
import { InventoryItemsService } from './inventory-items.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { UpdateInventoryItemDto } from './dto/update-inventory-item.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { AddStockDto } from './dto/add-stock.dto';
import { RemoveStockDto } from './dto/remove-stock.dto';
import { InventoryItem } from './inventory-items.entity';
import { StockMovement } from './stock-movement.entity';

@Controller('inventory-items')
export class InventoryItemsController {
  constructor(private readonly inventoryItemsService: InventoryItemsService) {}

  @Post()
  create(@Body() createInventoryItemDto: CreateInventoryItemDto): Promise<InventoryItem> {
    return this.inventoryItemsService.create(createInventoryItemDto);
  }

  @Get()
  findAll(): Promise<InventoryItem[]> {
    return this.inventoryItemsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<InventoryItem> {
    return this.inventoryItemsService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateInventoryItemDto: UpdateInventoryItemDto,
  ): Promise<InventoryItem> {
    return this.inventoryItemsService.update(id, updateInventoryItemDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.inventoryItemsService.remove(id);
  }

  @Put(':id/stock')
  updateStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStockDto: UpdateStockDto,
  ): Promise<InventoryItem> {
    return this.inventoryItemsService.updateStock(id, updateStockDto.quantity, updateStockDto.reason);
  }

  @Post(':id/stock/add')
  addStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() addStockDto: AddStockDto,
  ): Promise<InventoryItem> {
    return this.inventoryItemsService.addStock(id, addStockDto.quantity, addStockDto.reason);
  }

  @Post(':id/stock/remove')
  removeStock(
    @Param('id', ParseIntPipe) id: number,
    @Body() removeStockDto: RemoveStockDto,
  ): Promise<InventoryItem> {
    return this.inventoryItemsService.removeStock(id, removeStockDto.quantity, removeStockDto.reason);
  }

  @Get(':id/reorder-status')
  checkReorderLevel(@Param('id', ParseIntPipe) id: number): Promise<boolean> {
    return this.inventoryItemsService.checkReorderLevel(id);
  }

  @Get(':id/stock-movements')
  getStockMovements(@Param('id', ParseIntPipe) id: number): Promise<StockMovement[]> {
    return this.inventoryItemsService.getStockMovements(id);
  }
}