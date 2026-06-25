import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LocationsService } from './locations.service';
import { CreateLocationDto } from './dto/create-location.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from '../users/enums/userRoles.enum';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('locations')
@ApiBearerAuth()
@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new location (Admin only)' })
  async create(@Body() dto: CreateLocationDto) {
    const location = await this.locationsService.create(dto);
    return { message: 'Location created successfully', data: location };
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all active locations' })
  async findAll() {
    const locations = await this.locationsService.findAll();
    return { message: 'Locations retrieved successfully', data: locations };
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get location by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const location = await this.locationsService.findById(id);
    return { message: 'Location retrieved successfully', data: location };
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update location (Admin only)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLocationDto,
  ) {
    const location = await this.locationsService.update(id, dto);
    return { message: 'Location updated successfully', data: location };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete location (Admin only)' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.locationsService.remove(id);
    return { message: 'Location deleted successfully' };
  }
}