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
import { EmailCampaignsService } from './email-campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { JwtAuthGuard } from '../auth/guard/jwt.auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { CurrentUser } from '../auth/decorators/current.user.decorators';
import { UserRole } from '../users/enums/userRoles.enum';
import { User } from '../users/entities/user.entity';
import { CampaignStatus } from './enums/campaign-status.enum';

@ApiTags('Email Campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('email-campaigns')
export class EmailCampaignsController {
  constructor(private readonly service: EmailCampaignsService) {}

  @Post()
  async create(@Body() dto: CreateCampaignDto, @CurrentUser() user: User) {
    const data = await this.service.create(dto, user.id);
    return { message: 'Campaign created', data };
  }

  @Get()
  async findAll(@Query('status') status?: CampaignStatus) {
    const data = await this.service.findAll(status);
    return { data };
  }

  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.service.findOne(id);
    return { data };
  }

  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Partial<CreateCampaignDto>) {
    const data = await this.service.update(id, dto);
    return { message: 'Campaign updated', data };
  }

  @Post(':id/send')
  async send(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.service.send(id);
    return { message: 'Campaign sent', data };
  }
}
