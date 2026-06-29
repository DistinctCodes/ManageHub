import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ResourcesService } from './resources.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { BookResourceDto } from './dto/book-resource.dto';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { GetCurrentUser } from '../auth/decorators/getCurrentUser.decorator';
import { UserRole } from '../users/enums/userRoles.enum';

@ApiTags('Resources')
@ApiBearerAuth()
@Controller('resources')
export class ResourcesController {
  constructor(private readonly service: ResourcesService) {}

  @Get()
  async findAll() {
    return { data: await this.service.findAll() };
  }

  @Get('bookings/my')
  async getMyBookings(@GetCurrentUser('id') userId: string) {
    return { data: await this.service.getMyBookings(userId) };
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return { data: await this.service.findOne(id) };
  }

  @Get(':id/availability')
  async checkAvailability(@Param('id', ParseUUIDPipe) id: string, @Query('date') date?: string) {
    return this.service.checkAvailability(id, date);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async create(@Body() dto: CreateResourceDto) {
    return { message: 'Resource created', data: await this.service.create(dto) };
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<CreateResourceDto>) {
    return { data: await this.service.update(id, dto) };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.remove(id);
    return { message: 'Resource removed' };
  }

  @Post(':id/book')
  async book(@Param('id', ParseUUIDPipe) id: string, @GetCurrentUser('id') userId: string, @Body() dto: BookResourceDto) {
    return { data: await this.service.book(id, userId, dto) };
  }
}
