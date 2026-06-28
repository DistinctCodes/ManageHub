import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PackagesService } from './packages.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { JwtAuthGuard } from '../auth/guard/jwt.auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { CurrentUser } from '../auth/decorators/current.user.decorators';
import { UserRole } from '../users/enums/userRoles.enum';
import { User } from '../users/entities/user.entity';
import { PackageStatus } from './enums/package-status.enum';

@ApiTags('Packages')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('packages')
export class PackagesController {
  constructor(private readonly service: PackagesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async create(@Body() dto: CreatePackageDto, @CurrentUser() user: User) {
    const data = await this.service.create(dto, user.id);
    return { message: 'Package logged', data };
  }

  @Get('mine')
  async findMine(@CurrentUser() user: User) {
    const data = await this.service.findMine(user.id);
    return { data };
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async findAll(@Query('status') status?: PackageStatus) {
    const data = await this.service.findAll(status);
    return { data };
  }

  @Patch(':id/collect')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async collect(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.service.collect(id);
    return { message: 'Package marked as collected', data };
  }

  @Patch(':id/return')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  async returnToSender(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.service.returnToSender(id);
    return { message: 'Package marked as returned', data };
  }
}
