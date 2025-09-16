import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like, In } from 'typeorm';
import { FAQ, FAQCategory, FAQStatus } from './faq.entity';
import { CreateFAQDto } from './dto/create-faq.dto';
import { UpdateFAQDto } from './dto/update-faq.dto';
import { FAQQueryDto } from './dto/faq-query.dto';

@Injectable()
export class FAQService {
  constructor(
    @InjectRepository(FAQ)
    private faqRepository: Repository<FAQ>,
  ) {}

  // Admin Operations

  async createFAQ(createFAQDto: CreateFAQDto): Promise<FAQ> {
    // Check for duplicate questions
    const existingFAQ = await this.faqRepository.findOne({
      where: { question: createFAQDto.question },
    });

    if (existingFAQ) {
      throw new BadRequestException(
        'A FAQ with this question already exists',
      );
    }

    const faq = this.faqRepository.create(createFAQDto);
    return await this.faqRepository.save(faq);
  }

  async updateFAQ(id: string, updateFAQDto: UpdateFAQDto): Promise<FAQ> {
    const faq = await this.getFAQById(id);

    // If question is being updated, check for duplicates
    if (updateFAQDto.question && updateFAQDto.question !== faq.question) {
      const existingFAQ = await this.faqRepository.findOne({
        where: { question: updateFAQDto.question },
      });

      if (existingFAQ && existingFAQ.id !== id) {
        throw new BadRequestException(
          'A FAQ with this question already exists',
        );
      }
    }

    Object.assign(faq, updateFAQDto);
    return await this.faqRepository.save(faq);
  }

  async deleteFAQ(id: string): Promise<void> {
    const faq = await this.getFAQById(id);
    await this.faqRepository.remove(faq);
  }

  async toggleFAQStatus(id: string): Promise<FAQ> {
    const faq = await this.getFAQById(id);
    faq.isActive = !faq.isActive;
    faq.status = faq.isActive ? FAQStatus.ACTIVE : FAQStatus.INACTIVE;
    return await this.faqRepository.save(faq);
  }

  async bulkUpdatePriority(updates: Array<{ id: string; priority: number }>): Promise<FAQ[]> {
    const updatedFAQs = [];
    
    for (const update of updates) {
      const faq = await this.getFAQById(update.id);
      faq.priority = update.priority;
      updatedFAQs.push(await this.faqRepository.save(faq));
    }
    
    return updatedFAQs;
  }

  // User Operations

  async getAllFAQs(queryDto: FAQQueryDto = {}): Promise<{
    faqs: FAQ[];
    total: number;
    pagination: {
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }> {
    const where: FindOptionsWhere<FAQ> = {};
    
    // For public access, only show active FAQs
    if (queryDto.isActive !== false) {
      where.isActive = true;
      where.status = FAQStatus.ACTIVE;
    }

    if (queryDto.category) {
      where.category = queryDto.category;
    }

    if (queryDto.status) {
      where.status = queryDto.status;
    }

    let queryBuilder = this.faqRepository
      .createQueryBuilder('faq')
      .where(where);

    // Search functionality
    if (queryDto.search) {
      const searchTerm = `%${queryDto.search.toLowerCase()}%`;
      queryBuilder = queryBuilder.andWhere(
        '(LOWER(faq.question) LIKE :search OR LOWER(faq.answer) LIKE :search)',
        { search: searchTerm }
      );
    }

    // Tags filter
    if (queryDto.tags && queryDto.tags.length > 0) {
      queryBuilder = queryBuilder.andWhere(
        'faq.tags && :tags',
        { tags: queryDto.tags }
      );
    }

    // Sorting
    const sortBy = queryDto.sortBy || 'priority';
    const sortOrder = queryDto.sortOrder || 'DESC';
    
    if (sortBy === 'priority') {
      queryBuilder = queryBuilder
        .orderBy('faq.priority', sortOrder)
        .addOrderBy('faq.createdAt', 'DESC');
    } else {
      queryBuilder = queryBuilder.orderBy(`faq.${sortBy}`, sortOrder);
    }

    // Pagination
    const limit = queryDto.limit || 20;
    const offset = queryDto.offset || 0;
    
    queryBuilder = queryBuilder
      .limit(limit)
      .offset(offset);

    const [faqs, total] = await queryBuilder.getManyAndCount();

    return {
      faqs,
      total,
      pagination: {
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    };
  }

  async getFAQById(id: string): Promise<FAQ> {
    const faq = await this.faqRepository.findOne({ where: { id } });

    if (!faq) {
      throw new NotFoundException(`FAQ with ID ${id} not found`);
    }

    return faq;
  }

  async getFAQByIdWithViewIncrement(id: string): Promise<FAQ> {
    const faq = await this.getFAQById(id);
    
    // Increment view count
    faq.viewCount += 1;
    await this.faqRepository.save(faq);
    
    return faq;
  }

  async getFAQsByCategory(category: FAQCategory, limit: number = 10): Promise<FAQ[]> {
    return await this.faqRepository.find({
      where: {
        category,
        isActive: true,
        status: FAQStatus.ACTIVE,
      },
      order: {
        priority: 'DESC',
        createdAt: 'DESC',
      },
      take: limit,
    });
  }

  async getPopularFAQs(limit: number = 10): Promise<FAQ[]> {
    return await this.faqRepository.find({
      where: {
        isActive: true,
        status: FAQStatus.ACTIVE,
      },
      order: {
        viewCount: 'DESC',
        priority: 'DESC',
      },
      take: limit,
    });
  }

  async searchFAQs(searchTerm: string, limit: number = 10): Promise<FAQ[]> {
    const search = `%${searchTerm.toLowerCase()}%`;
    
    return await this.faqRepository
      .createQueryBuilder('faq')
      .where('faq.isActive = :isActive', { isActive: true })
      .andWhere('faq.status = :status', { status: FAQStatus.ACTIVE })
      .andWhere(
        '(LOWER(faq.question) LIKE :search OR LOWER(faq.answer) LIKE :search OR faq.tags && :tags)',
        { 
          search,
          tags: [searchTerm.toLowerCase()]
        }
      )
      .orderBy('faq.priority', 'DESC')
      .addOrderBy('faq.viewCount', 'DESC')
      .limit(limit)
      .getMany();
  }

  // Statistics and Analytics

  async getFAQStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    draft: number;
    byCategory: Record<string, number>;
    totalViews: number;
    avgViewsPerFAQ: number;
  }> {
    const total = await this.faqRepository.count();
    const active = await this.faqRepository.count({
      where: { status: FAQStatus.ACTIVE, isActive: true },
    });
    const inactive = await this.faqRepository.count({
      where: { status: FAQStatus.INACTIVE },
    });
    const draft = await this.faqRepository.count({
      where: { status: FAQStatus.DRAFT },
    });

    // Category statistics
    const categoryStats = await this.faqRepository
      .createQueryBuilder('faq')
      .select('faq.category', 'category')
      .addSelect('COUNT(*)', 'count')
      .where('faq.isActive = :isActive', { isActive: true })
      .groupBy('faq.category')
      .getRawMany();

    const byCategory = categoryStats.reduce((acc, stat) => {
      acc[stat.category] = parseInt(stat.count);
      return acc;
    }, {});

    // View statistics
    const viewStats = await this.faqRepository
      .createQueryBuilder('faq')
      .select('SUM(faq.viewCount)', 'totalViews')
      .where('faq.isActive = :isActive', { isActive: true })
      .getRawOne();

    const totalViews = parseInt(viewStats?.totalViews) || 0;
    const avgViewsPerFAQ = active > 0 ? Math.round(totalViews / active) : 0;

    return {
      total,
      active,
      inactive,
      draft,
      byCategory,
      totalViews,
      avgViewsPerFAQ,
    };
  }

  async getCategories(): Promise<FAQCategory[]> {
    return Object.values(FAQCategory);
  }
}
