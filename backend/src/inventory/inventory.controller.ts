import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateInventoryItemDto } from './dto/create-inventory-item.dto';
import { AssignInventoryItemDto } from './dto/assign-inventory-item.dto';
import { JwtAuthGuard } from '../auth/guard/jwt.auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from '../users/enums/userRoles.enum';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreateInventoryItemDto) {
    const data = await this.service.create(dto);
    return { message: 'Item created', data };
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async findAll(
    @Query('category') category?: string,
    @Query('condition') condition?: string,
    @Query('location') location?: string,
    @Query('assignedToUserId') assignedToUserId?: string,
  ) {
    const data = await this.service.findAll({ category, condition, location, assignedToUserId });
    return { data };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.service.findOne(id);
    return { data };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<CreateInventoryItemDto>) {
    const data = await this.service.update(id, dto);
    return { message: 'Item updated', data };
  }

  @Post(':id/assign')
  @Roles(UserRole.ADMIN)
  async assign(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignInventoryItemDto) {
    const data = await this.service.assign(id, dto);
    return { message: 'Item assigned', data };
  }

  @Post(':id/unassign')
  @Roles(UserRole.ADMIN)
  async unassign(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.service.unassign(id);
    return { message: 'Item unassigned', data };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.softDelete(id);
    return { message: 'Item retired' };
  }
}
