import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { InventoryMovementsService } from './inventory-movements.service';
import { CreateInventoryMovementDto } from './dto/create-inventory-movement.dto';
import { InventoryMovement } from './entities/inventory-movement.entity';

@ApiTags('Inventory Movements')
@Controller('inventory-movements')
export class InventoryMovementsController {
  constructor(private readonly service: InventoryMovementsService) {}

  @Post()
  @ApiOperation({ summary: 'Record stock IN/OUT movement' })
  @ApiResponse({ status: 201, type: InventoryMovement })
  create(@Body() dto: CreateInventoryMovementDto) {
    return this.service.createMovement(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get inventory movements (optionally by itemId)' })
  findAll(@Query('itemId') itemId?: string) {
    return this.service.findMovements(itemId);
  }
}
