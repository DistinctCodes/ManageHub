import {
  Controller,
  Post,
  Delete,
  Get,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RolesGuard } from '../../auth/guard/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorators';
import { UserRole } from '../../users/enums/userRoles.enum';
import { GetCurrentUser } from '../../auth/decorators/getCurrentUser.decorator';
import { WaitlistProvider } from './providers/waitlist.provider';
import { JoinWaitlistDto } from './dto/join-waitlist.dto';

@ApiTags('sandbox/waitlist')
@ApiBearerAuth()
@Controller('sandbox/waitlist')
export class WaitlistController {
  constructor(private readonly waitlistProvider: WaitlistProvider) {}

  @Post()
  @ApiOperation({ summary: 'Join the waitlist for a workspace' })
  async join(
    @Body() dto: JoinWaitlistDto,
    @GetCurrentUser('id') userId: string,
  ) {
    const data = await this.waitlistProvider.join(dto, userId);
    return { message: 'Added to waitlist successfully', data };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove yourself from the waitlist' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @GetCurrentUser('id') userId: string,
  ) {
    await this.waitlistProvider.remove(id, userId);
    return { message: 'Removed from waitlist successfully' };
  }

  @Get('me')
  @ApiOperation({ summary: "Get current user's waitlist entries" })
  async getMyEntries(@GetCurrentUser('id') userId: string) {
    const data = await this.waitlistProvider.getMyEntries(userId);
    return { message: 'Waitlist entries retrieved', data };
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'List all waitlist entries for a workspace (Admin)',
  })
  async getByWorkspace(
    @Query('workspaceId', ParseUUIDPipe) workspaceId: string,
  ) {
    const data = await this.waitlistProvider.getByWorkspace(workspaceId);
    return { message: 'Waitlist entries retrieved', data };
  }
}
