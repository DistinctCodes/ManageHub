import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ContractsService } from './contracts.service';
import { CreateContractDto } from './dto/create-contract.dto';
import { JwtAuthGuard } from '../auth/guard/jwt.auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { CurrentUser } from '../auth/decorators/current.user.decorators';
import { UserRole } from '../users/enums/userRoles.enum';
import { User } from '../users/entities/user.entity';

@ApiTags('Contracts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('contracts')
export class ContractsController {
  constructor(private readonly service: ContractsService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async create(@Body() dto: CreateContractDto, @CurrentUser() user: User) {
    const data = await this.service.create(dto, user.id);
    return { message: 'Contract created', data };
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async findAll(@Query('memberId') memberId?: string) {
    const data = await this.service.findAll(memberId);
    return { data };
  }

  @Get('mine')
  async findMine(@CurrentUser() user: User) {
    const data = await this.service.findAll(user.id);
    return { data };
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.service.findOne(id);
    return { data };
  }

  @Patch(':id/send')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async send(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.service.send(id);
    return { message: 'Contract sent', data };
  }

  @Patch(':id/sign')
  async sign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('signatureData') signatureData: string,
    @CurrentUser() user: User,
  ) {
    const data = await this.service.sign(id, user.id, signatureData);
    return { message: 'Contract signed', data };
  }

  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async cancel(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.service.cancel(id);
    return { message: 'Contract cancelled', data };
  }
}
