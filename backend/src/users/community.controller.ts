import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './providers/users.service';

@ApiTags('community')
@ApiBearerAuth()
@Controller('community')
export class CommunityController {
  constructor(private readonly usersService: UsersService) {}

  @Get('members')
  @ApiOperation({ summary: 'List all active community members (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
  @ApiQuery({ name: 'search', required: false, type: String })
  async getMembers(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    const result = await this.usersService.getCommunityMembers({
      page,
      limit,
      search,
    });
    return { message: 'Community members retrieved successfully', ...result };
  }

  @Get('members/:username')
  @ApiOperation({ summary: 'Get a member public profile by username' })
  async getPublicProfile(@Param('username') username: string) {
    const profile = await this.usersService.getPublicProfile(username);
    return { message: 'Profile retrieved successfully', data: profile };
  }
}
