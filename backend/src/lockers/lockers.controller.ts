import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LockersService } from './lockers.service';
import { CreateLockerDto } from './dto/create-locker.dto';
import { UpdateLockerDto } from './dto/update-locker.dto';
import { AssignLockerDto } from './dto/assign-locker.dto';
import { JwtAuthGuard } from '../auth/guard/jwt.auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { CurrentUser } from '../auth/decorators/current.user.decorators';
import { UserRole } from '../users/enums/userRoles.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('Lockers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('lockers')
export class LockersController {
  constructor(private readonly service: LockersService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() dto: CreateLockerDto) {
    const data = await this.service.create(dto);
    return { message: 'Locker created', data };
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async findAll() {
    const data = await this.service.findAll();
    return { data };
  }

  @Get('mine')
  async findMine(@CurrentUser() user: User) {
    const data = await this.service.findMine(user.id);
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
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateLockerDto) {
    const data = await this.service.update(id, dto);
    return { message: 'Locker updated', data };
  }

  @Post(':id/assign')
  @Roles(UserRole.ADMIN)
  async assign(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AssignLockerDto) {
    const data = await this.service.assign(id, dto);
    return { message: 'Locker assigned', data };
  }

  @Post(':id/unassign')
  @Roles(UserRole.ADMIN)
  async unassign(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.service.unassign(id);
    return { message: 'Locker unassigned', data };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.softDelete(id);
    return { message: 'Locker deleted' };
  }
}
