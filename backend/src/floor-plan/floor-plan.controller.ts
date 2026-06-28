import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FloorPlanService } from './floor-plan.service';
import { CreateFloorPlanDto } from './dto/create-floor-plan.dto';
import { SaveZonesDto } from './dto/save-zones.dto';
import { JwtAuthGuard } from '../auth/guard/jwt.auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from '../users/enums/userRoles.enum';

@ApiTags('Floor Plan')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('floor-plan')
export class FloorPlanController {
  constructor(private readonly service: FloorPlanService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async create(@Body() dto: CreateFloorPlanDto) {
    const data = await this.service.create(dto);
    return { message: 'Floor plan created', data };
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async findAll() {
    const data = await this.service.findAll();
    return { data };
  }

  @Get('active')
  async getActive() {
    const data = await this.service.getActive();
    return { data };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<CreateFloorPlanDto>,
  ) {
    const data = await this.service.update(id, dto);
    return { message: 'Floor plan updated', data };
  }

  @Put(':id/zones')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async saveZones(@Param('id', ParseUUIDPipe) id: string, @Body() dto: SaveZonesDto) {
    const data = await this.service.saveZones(id, dto);
    return { message: 'Zones saved', data };
  }

  @Patch(':id/activate')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async activate(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.service.activate(id);
    return { message: 'Floor plan activated', data };
  }
}
