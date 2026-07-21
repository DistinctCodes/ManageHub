import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NewsletterSubscriber } from '../entities/newsletter.entity';
import { PaginationQueryDto } from '../../config/pagination/dto/pagination-query.dto';
import { PaginatedResponse } from '../../config/pagination/interface/paginated-response-interface';
import { NewsletterSubscriberAdminDto } from '../dto/admin-fetch.dto';

type CategoryFilter = 'active' | 'inactive' | 'verified' | 'pending';

@Injectable()
export class ListNewsletterSubscribersProvider {
  constructor(
    @InjectRepository(NewsletterSubscriber)
    private readonly repo: Repository<NewsletterSubscriber>,
  ) {}

  async execute(
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<NewsletterSubscriberAdminDto>> {
    const page = query.page ?? 1;
    const perPage = query.perPage ?? 10;

    const qb = this.repo.createQueryBuilder('s');

    // Default: exclude soft-deleted subscribers from admin listing
    // If you want to include unsubscribed history, switch to `.withDeleted()` and add filters.
    qb.where('s.deletedAt IS NULL');

    // Search by email
    if (query.searchTerm) {
      qb.andWhere('LOWER(s.email) LIKE :email', {
        email: `%${query.searchTerm.trim().toLowerCase()}%`,
      });
    }

    // Filter mapping using existing `category` field
    const filter = (query.category?.trim().toLowerCase() ??
      '') as CategoryFilter;

    if (filter === 'active') {
      qb.andWhere('s.isActive = true');
    } else if (filter === 'inactive') {
      qb.andWhere('s.isActive = false');
    } else if (filter === 'verified') {
      qb.andWhere('s.isVerified = true');
    } else if (filter === 'pending') {
      qb.andWhere('s.isVerified = false');
    }

    qb.orderBy('s.createdAt', 'DESC');

    const [rows, totalItems] = await qb
      .skip((page - 1) * perPage)
      .take(perPage)
      .getManyAndCount();

    const totalPages = Math.max(1, Math.ceil(totalItems / perPage));

    return {
      message: 'Subscribers fetched successfully',
      items: rows.map(NewsletterSubscriberAdminDto.fromEntity),
      meta: {
        currentPage: page,
        itemsPerPage: perPage,
        totalItems,
        totalPages,
        hasPreviousPage: page > 1,
        hasNextPage: page < totalPages,
      },
      totalAmount: '0',
    };
  }
}
