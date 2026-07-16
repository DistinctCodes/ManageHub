import {
  Body, Controller, Delete, Get, Param, ParseUUIDPipe,
  Patch, Post, UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResourcesService } from './resources.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { Roles } from '../auth/decorators/roles.decorators';
import { RolesGuard } from '../auth/guard/roles.guard';
import { UserRole } from '../users/enums/userRoles.enum';

@ApiTags('Resources')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('resources')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get()
  @Roles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List all available resources' })
  async findAll() {
    const data = await this.resourcesService.findAll();
    return { message: 'Resources retrieved', data };
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new resource (admin only)' })
  async create(@Body() dto: CreateResourceDto) {
    const data = await this.resourcesService.create(dto);
    return { message: 'Resource created', data };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update a resource (admin only)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateResourceDto,
  ) {
    const data = await this.resourcesService.update(id, dto);
    return { message: 'Resource updated', data };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Soft-delete a resource (admin only)' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.resourcesService.softDelete(id);
    return { message: 'Resource deleted' };
  }

  @Post('check-availability')
  @Roles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Check availability for a list of resource IDs' })
  async checkAvailability(@Body('resourceIds') resourceIds: string[]) {
    const data = await this.resourcesService.checkAvailability(resourceIds);
    return { message: 'Availability checked', data };
  }
}