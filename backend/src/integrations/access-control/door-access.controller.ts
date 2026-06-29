import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DoorAccessService } from './door-access.service';
import { ConfigureAccessDto } from './dto/configure-access.dto';
import { AccessLogQueryDto } from './dto/access-log-query.dto';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorators';
import { UserRole } from '../../users/enums/userRoles.enum';

@ApiTags('integrations/access')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@Controller('integrations/access')
export class DoorAccessController {
  constructor(private readonly doorAccessService: DoorAccessService) {}

  @Post('configure')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Configure Kisi/Brivo API key (admin only)' })
  async configure(@Body() dto: ConfigureAccessDto) {
    const data = await this.doorAccessService.configure(dto);
    return { message: 'Access integration configured', data: { provider: data.provider, isEnabled: data.isEnabled, configuredAt: data.configuredAt } };
  }

  @Get('status')
  @ApiOperation({ summary: 'Get integration status (admin only)' })
  async status() {
    const data = await this.doorAccessService.getStatus();
    return { message: 'Access integration status', data };
  }

  @Get('logs')
  @ApiOperation({ summary: 'Paginated credential grant/revoke log (admin only)' })
  async logs(@Query() query: AccessLogQueryDto) {
    const data = await this.doorAccessService.getLogs(query);
    return { message: 'Access credential logs retrieved', data };
  }
}
