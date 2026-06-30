import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CommunityService } from './community.service';
import { CreatePostDto } from './dto/create-post.dto';
import { PostQueryDto } from './dto/post-query.dto';
import { GetCurrentUser } from '../auth/decorators/getCurrentUser.decorator';
import { Roles } from '../auth/decorators/roles.decorators';
import { RolesGuard } from '../auth/guard/roles.guard';
import { UserRole } from '../users/enums/userRoles.enum';

@ApiTags('Community Feed')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('community/posts')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  // POST /community/posts — any active authenticated member
  @Post()
  @Roles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a community post' })
  async createPost(
    @Body() dto: CreatePostDto,
    @GetCurrentUser('id') userId: string,
  ) {
    const post = await this.communityService.createPost(dto, userId);
    return { message: 'Post created successfully', data: post };
  }

  // GET /community/posts — paginated feed; pinned first, then newest
  @Get()
  @Roles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get paginated community feed (pinned first, then newest)' })
  async getFeed(@Query() query: PostQueryDto) {
    return this.communityService.getFeed(query);
  }

  // DELETE /community/posts/:id — soft-delete own post (member) or any post (admin)
  @Delete(':id')
  @Roles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a post (own post for members, any post for admins)' })
  async deletePost(
    @Param('id', ParseUUIDPipe) id: string,
    @GetCurrentUser('id') userId: string,
    @GetCurrentUser('role') userRole: UserRole,
  ) {
    await this.communityService.deletePost(id, userId, userRole);
    return { message: 'Post deleted successfully' };
  }

  // POST /community/posts/:id/like — toggle like/unlike
  @Post(':id/like')
  @Roles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Toggle like/unlike on a post' })
  async toggleLike(
    @Param('id', ParseUUIDPipe) id: string,
    @GetCurrentUser('id') userId: string,
  ) {
    const result = await this.communityService.toggleLike(id, userId);
    return {
      message: result.liked ? 'Post liked' : 'Post unliked',
      data: result,
    };
  }

  // PATCH /community/posts/:id/pin — toggle pin/unpin (admin only)
  @Patch(':id/pin')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Toggle pin/unpin on a post (admin only)' })
  async togglePin(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.communityService.togglePin(id);
    return {
      message: result.isPinned ? 'Post pinned' : 'Post unpinned',
      data: result,
    };
  }
}
