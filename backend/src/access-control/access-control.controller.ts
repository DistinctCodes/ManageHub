import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AccessControlService } from './access-control.service';
import { ApiKeyGuard } from './guards/api-key.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '../users/enums/userRoles.enum';
import { CreateDeviceDto } from './dto/create-device.dto';
import { WebhookDto } from './dto/webhook.dto';
import { LogQueryDto } from './dto/log-query.dto';
import { GrantAccessDto } from './dto/grant-access.dto';
import { UpdateDeviceStatusDto } from './dto/update-device-status.dto';

@Controller('access-control')
export class AccessControlController {
  constructor(private readonly service: AccessControlService) {}

  @Public()
  @UseGuards(ApiKeyGuard)
  @Post('webhook')
  handleWebhook(@Body() dto: WebhookDto) {
    return this.service.handleWebhook(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('devices')
  createDevice(@Body() dto: CreateDeviceDto) {
    return this.service.createDevice(dto);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('devices')
  findAllDevices() {
    return this.service.findAllDevices();
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Get('logs')
  findLogs(@Query() query: LogQueryDto) {
    return this.service.findLogs(query);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @Post('grant/:userId')
  grantAccess(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: GrantAccessDto,
  ) {
    return this.service.grantAccess(userId, dto);
  }

  @Public()
  @UseGuards(ApiKeyGuard)
  @Patch('devices/:id/status')
  updateDeviceStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateDeviceStatusDto,
  ) {
    return this.service.updateDeviceStatus(id, dto);
  }
}
