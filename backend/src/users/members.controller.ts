import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './providers/users.service';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from './enums/userRoles.enum';
import { GetCurrentUser } from '../auth/decorators/getCurrentUser.decorator';
import { MemberQueryDto } from './dto/member-query.dto';
import { UpdateMemberStatusDto } from './dto/update-member-status.dto';

@ApiTags('members')
@ApiBearerAuth()
@Controller('members')
export class MembersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Get member statistics (Admin/Staff)' })
  async getStats() {
    const stats = await this.usersService.getMemberStats();
    return { message: 'Member stats retrieved', data: stats };
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current user member profile' })
  async getMyProfile(@GetCurrentUser('id') userId: string) {
    const profile = await this.usersService.getMemberProfile(userId);
    return { message: 'Profile retrieved successfully', data: profile };
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'List all members (Admin/Staff)' })
  async findAll(@Query() query: MemberQueryDto) {
    const result = await this.usersService.getMembers(query);
    return { message: 'Members retrieved successfully', ...result };
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Get member by ID (Admin/Staff)' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const profile = await this.usersService.getMemberProfile(id);
    return { message: 'Member retrieved successfully', data: profile };
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Update member status (Admin/Staff)' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMemberStatusDto,
  ) {
    const user = await this.usersService.updateMemberStatus(id, dto.status);
    return { message: 'Member status updated successfully', data: user };
  }
}
