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
import { NpsService } from './nps.service';
import { RespondNpsDto } from './dto/respond-nps.dto';
import { NpsQueryDto } from './dto/nps-query.dto';
import { GetCurrentUser } from '../auth/decorators/getCurrentUser.decorator';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from '../users/enums/userRoles.enum';

@ApiTags('nps')
@ApiBearerAuth()
@Controller('nps')
export class NpsController {
  constructor(private readonly npsService: NpsService) {}

  @Post('respond')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit NPS survey response (member)' })
  async respond(
    @GetCurrentUser('id') userId: string,
    @Body() dto: RespondNpsDto,
  ) {
    const response = await this.npsService.respond(userId, dto);
    return { message: 'Thank you for your feedback!', data: response };
  }

  @Get('summary')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Get NPS summary stats (admin)' })
  async summary() {
    const data = await this.npsService.getSummary();
    return { message: 'NPS summary retrieved', data };
  }

  @Get('responses')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Get paginated NPS responses (admin)' })
  async responses(@Query() query: NpsQueryDto) {
    const data = await this.npsService.getResponses(query);
    return { message: 'NPS responses retrieved', data };
  }
}
