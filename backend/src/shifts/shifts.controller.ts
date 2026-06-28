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
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ShiftsService } from './shifts.service';
import { CreateShiftDto } from './dto/create-shift.dto';
import { JwtAuthGuard } from '../auth/guard/jwt.auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { CurrentUser } from '../auth/decorators/current.user.decorators';
import { UserRole } from '../users/enums/userRoles.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('Shifts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly service: ShiftsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async create(@Body() dto: CreateShiftDto, @CurrentUser() user: User) {
    const data = await this.service.create(dto, user.id);
    return { message: 'Shift created', data };
  }

  @Get()
  async findAll(
    @CurrentUser() user: User,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const data = await this.service.findAll(user.id, user.role, startDate, endDate);
    return { data };
  }

  @Get('this-week')
  async thisWeek(@CurrentUser() user: User) {
    const data = await this.service.thisWeek(user.id, user.role);
    return { data };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<CreateShiftDto>) {
    const data = await this.service.update(id, dto);
    return { message: 'Shift updated', data };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.remove(id);
    return { message: 'Shift deleted' };
  }
}
