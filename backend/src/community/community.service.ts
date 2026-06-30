import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CommunityPost } from './entities/community-post.entity';
import { CommunityPostLike } from './entities/community-post-like.entity';
import { CreatePostDto } from './dto/create-post.dto';
import { PostQueryDto } from './dto/post-query.dto';
import { UserRole } from '../users/enums/userRoles.enum';
import { ErrorCatch } from '../utils/error';

@Injectable()
export class CommunityService {
  constructor(
    @InjectRepository(CommunityPost)
    private readonly postRepo: Repository<CommunityPost>,

    @InjectRepository(CommunityPostLike)
    private readonly likeRepo: Repository<CommunityPostLike>,

    private readonly dataSource: DataSource,
  ) {}

  // ─── Create Post ──────────────────────────────────────────────────────────

  async createPost(dto: CreatePostDto, authorUserId: string): Promise<CommunityPost> {
    try {
      const post = this.postRepo.create({ body: dto.body, authorUserId });
      return await this.postRepo.save(post);
    } catch (error) {
      ErrorCatch(error, 'Error creating community post');
    }
  }

  // ─── Paginated Feed ───────────────────────────────────────────────────────

  async getFeed(query: PostQueryDto) {
    try {
      const { page = 1, limit = 20 } = query;

      const [items, total] = await this.postRepo
        .createQueryBuilder('post')
        .leftJoin('post.author', 'author')
        .addSelect([
          'author.id',
          'author.username',
          'author.firstname',
          'author.lastname',
          'author.profilePicture',
        ])
        .where('post.isDeleted = :isDeleted', { isDeleted: false })
        // pinned first, then newest
        .orderBy('post.isPinned', 'DESC')
        .addOrderBy('post.createdAt', 'DESC')
        .skip((page - 1) * limit)
        .take(limit)
        .getManyAndCount();

      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      ErrorCatch(error, 'Error fetching community feed');
    }
  }

  // ─── Soft-Delete Post ─────────────────────────────────────────────────────

  async deletePost(
    postId: string,
    userId: string,
    userRole: UserRole,
  ): Promise<void> {
    try {
      const post = await this.findPostOrFail(postId);

      const isAdmin =
        userRole === UserRole.ADMIN || userRole === UserRole.SUPER_ADMIN;

      if (!isAdmin && post.authorUserId !== userId) {
        throw new ForbiddenException('You can only delete your own posts');
      }

      post.isDeleted = true;
      await this.postRepo.save(post);
    } catch (error) {
      ErrorCatch(error, 'Error deleting community post');
    }
  }

  // ─── Toggle Like ──────────────────────────────────────────────────────────

  async toggleLike(
    postId: string,
    userId: string,
  ): Promise<{ liked: boolean; likeCount: number }> {
    try {
      const post = await this.findPostOrFail(postId);

      const existingLike = await this.likeRepo.findOne({
        where: { postId, userId },
      });

      // Use a transaction to update like row + likeCount atomically
      await this.dataSource.transaction(async (manager) => {
        if (existingLike) {
          await manager.remove(CommunityPostLike, existingLike);
          await manager
            .createQueryBuilder()
            .update(CommunityPost)
            .set({ likeCount: () => '"likeCount" - 1' })
            .where('id = :id AND "likeCount" > 0', { id: postId })
            .execute();
        } else {
          const like = manager.create(CommunityPostLike, { postId, userId });
          await manager.save(CommunityPostLike, like);
          await manager
            .createQueryBuilder()
            .update(CommunityPost)
            .set({ likeCount: () => '"likeCount" + 1' })
            .where('id = :id', { id: postId })
            .execute();
        }
      });

      // Reload updated count
      const updated = await this.postRepo.findOne({ where: { id: postId } });
      return {
        liked: !existingLike,
        likeCount: updated?.likeCount ?? post.likeCount,
      };
    } catch (error) {
      ErrorCatch(error, 'Error toggling post like');
    }
  }

  // ─── Toggle Pin ───────────────────────────────────────────────────────────

  async togglePin(postId: string): Promise<{ isPinned: boolean }> {
    try {
      const post = await this.findPostOrFail(postId);
      post.isPinned = !post.isPinned;
      await this.postRepo.save(post);
      return { isPinned: post.isPinned };
    } catch (error) {
      ErrorCatch(error, 'Error toggling post pin');
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async findPostOrFail(postId: string): Promise<CommunityPost> {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException(`Post ${postId} not found`);
    if (post.isDeleted) throw new NotFoundException(`Post ${postId} not found`);
    return post;
  }
}
