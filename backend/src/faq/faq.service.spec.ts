import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FAQService } from './faq.service';
import { FAQ, FAQCategory, FAQStatus } from './faq.entity';
import { CreateFAQDto } from './dto/create-faq.dto';
import { UpdateFAQDto } from './dto/update-faq.dto';
import { FAQQueryDto } from './dto/faq-query.dto';

describe('FAQService', () => {
  let service: FAQService;
  let repository: Repository<FAQ>;

  const mockFAQ: FAQ = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    question: 'What is the workspace policy?',
    answer: 'The workspace policy includes...',
    category: FAQCategory.WORKSPACE,
    status: FAQStatus.ACTIVE,
    isActive: true,
    priority: 1,
    viewCount: 0,
    tags: ['workspace', 'policy'],
    metadata: { version: '1.0' },
    createdBy: 'admin',
    updatedBy: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    offset: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn(),
    getMany: jest.fn(),
    getRawMany: jest.fn(),
    getRawOne: jest.fn(),
    update: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    execute: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FAQService,
        {
          provide: getRepositoryToken(FAQ),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<FAQService>(FAQService);
    repository = module.get<Repository<FAQ>>(getRepositoryToken(FAQ));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createFAQ', () => {
    const createFAQDto: CreateFAQDto = {
      question: 'What is the workspace policy?',
      answer: 'The workspace policy includes...',
      category: FAQCategory.WORKSPACE,
      createdBy: 'admin',
    };

    it('should create a new FAQ successfully', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.create.mockReturnValue(mockFAQ);
      mockRepository.save.mockResolvedValue(mockFAQ);

      const result = await service.createFAQ(createFAQDto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { question: createFAQDto.question },
      });
      expect(mockRepository.create).toHaveBeenCalledWith(createFAQDto);
      expect(mockRepository.save).toHaveBeenCalledWith(mockFAQ);
      expect(result).toEqual(mockFAQ);
    });

    it('should throw BadRequestException if question already exists', async () => {
      mockRepository.findOne.mockResolvedValue(mockFAQ);

      await expect(service.createFAQ(createFAQDto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('updateFAQ', () => {
    const updateFAQDto: UpdateFAQDto = {
      answer: 'Updated answer',
      updatedBy: 'admin2',
    };

    it('should update an existing FAQ successfully', async () => {
      const updatedFAQ = { ...mockFAQ, ...updateFAQDto };
      
      mockRepository.findOne.mockResolvedValue(mockFAQ);
      mockRepository.save.mockResolvedValue(updatedFAQ);

      const result = await service.updateFAQ(mockFAQ.id, updateFAQDto);

      expect(result).toEqual(updatedFAQ);
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining(updateFAQDto),
      );
    });

    it('should throw NotFoundException if FAQ does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateFAQ('non-existent-id', updateFAQDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if question is duplicate', async () => {
      const existingFAQ = { ...mockFAQ, id: 'different-id' };
      const updateWithDuplicateQuestion: UpdateFAQDto = {
        question: 'Duplicate question',
      };

      // First call returns the FAQ to update, second call returns the duplicate
      mockRepository.findOne
        .mockResolvedValueOnce(mockFAQ)
        .mockResolvedValueOnce(existingFAQ);

      await expect(
        service.updateFAQ(mockFAQ.id, updateWithDuplicateQuestion),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteFAQ', () => {
    it('should delete an existing FAQ', async () => {
      mockRepository.findOne.mockResolvedValue(mockFAQ);
      mockRepository.remove.mockResolvedValue(mockFAQ);

      await service.deleteFAQ(mockFAQ.id);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockFAQ.id },
      });
      expect(mockRepository.remove).toHaveBeenCalledWith(mockFAQ);
    });

    it('should throw NotFoundException if FAQ does not exist', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.deleteFAQ('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('toggleFAQStatus', () => {
    it('should toggle FAQ status from active to inactive', async () => {
      const inactiveFAQ = {
        ...mockFAQ,
        isActive: false,
        status: FAQStatus.INACTIVE,
      };

      mockRepository.findOne.mockResolvedValue(mockFAQ);
      mockRepository.save.mockResolvedValue(inactiveFAQ);

      const result = await service.toggleFAQStatus(mockFAQ.id);

      expect(result.isActive).toBe(false);
      expect(result.status).toBe(FAQStatus.INACTIVE);
    });
  });

  describe('getAllFAQs', () => {
    const queryDto: FAQQueryDto = {
      limit: 10,
      offset: 0,
      category: FAQCategory.WORKSPACE,
    };

    it('should return paginated FAQs with filters', async () => {
      const faqs = [mockFAQ];
      const total = 1;

      mockRepository.createQueryBuilder.mockReturnValue({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([faqs, total]),
      });

      const result = await service.getAllFAQs(queryDto);

      expect(result).toEqual({
        faqs,
        total,
        pagination: {
          limit: 10,
          offset: 0,
          hasMore: false,
        },
      });
    });
  });

  describe('getFAQById', () => {
    it('should return FAQ by ID', async () => {
      mockRepository.findOne.mockResolvedValue(mockFAQ);

      const result = await service.getFAQById(mockFAQ.id);

      expect(result).toEqual(mockFAQ);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockFAQ.id },
      });
    });

    it('should throw NotFoundException if FAQ not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.getFAQById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getFAQByIdWithViewIncrement', () => {
    it('should increment view count when getting FAQ', async () => {
      const updatedFAQ = { ...mockFAQ, viewCount: 1 };
      
      mockRepository.findOne.mockResolvedValue(mockFAQ);
      mockRepository.save.mockResolvedValue(updatedFAQ);

      const result = await service.getFAQByIdWithViewIncrement(mockFAQ.id);

      expect(result.viewCount).toBe(1);
      expect(mockRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ viewCount: 1 }),
      );
    });
  });

  describe('getFAQsByCategory', () => {
    it('should return FAQs filtered by category', async () => {
      const faqs = [mockFAQ];
      mockRepository.find.mockResolvedValue(faqs);

      const result = await service.getFAQsByCategory(FAQCategory.WORKSPACE);

      expect(result).toEqual(faqs);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          category: FAQCategory.WORKSPACE,
          isActive: true,
          status: FAQStatus.ACTIVE,
        },
        order: {
          priority: 'DESC',
          createdAt: 'DESC',
        },
        take: 10,
      });
    });
  });

  describe('getPopularFAQs', () => {
    it('should return FAQs ordered by view count', async () => {
      const popularFAQs = [{ ...mockFAQ, viewCount: 100 }];
      mockRepository.find.mockResolvedValue(popularFAQs);

      const result = await service.getPopularFAQs();

      expect(result).toEqual(popularFAQs);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          isActive: true,
          status: FAQStatus.ACTIVE,
        },
        order: {
          viewCount: 'DESC',
          priority: 'DESC',
        },
        take: 10,
      });
    });
  });

  describe('searchFAQs', () => {
    it('should search FAQs by term', async () => {
      const searchResults = [mockFAQ];
      
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(searchResults),
      };

      mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.searchFAQs('workspace');

      expect(result).toEqual(searchResults);
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        '(LOWER(faq.question) LIKE :search OR LOWER(faq.answer) LIKE :search OR faq.tags && :tags)',
        {
          search: '%workspace%',
          tags: ['workspace'],
        },
      );
    });
  });

  describe('getFAQStats', () => {
    it('should return FAQ statistics', async () => {
      const statsData = {
        total: 10,
        active: 8,
        inactive: 1,
        draft: 1,
      };

      mockRepository.count
        .mockResolvedValueOnce(statsData.total)
        .mockResolvedValueOnce(statsData.active)
        .mockResolvedValueOnce(statsData.inactive)
        .mockResolvedValueOnce(statsData.draft);

      const categoryStats = [{ category: 'general', count: '5' }];
      const viewStats = { totalViews: '100' };

      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue(categoryStats),
        getRawOne: jest.fn().mockResolvedValue(viewStats),
      };

      mockRepository.createQueryBuilder
        .mockReturnValueOnce(mockQueryBuilder)
        .mockReturnValueOnce(mockQueryBuilder);

      const result = await service.getFAQStats();

      expect(result).toEqual({
        total: statsData.total,
        active: statsData.active,
        inactive: statsData.inactive,
        draft: statsData.draft,
        byCategory: { general: 5 },
        totalViews: 100,
        avgViewsPerFAQ: 13, // 100/8 rounded
      });
    });
  });

  describe('getCategories', () => {
    it('should return all FAQ categories', async () => {
      const result = await service.getCategories();

      expect(result).toEqual(Object.values(FAQCategory));
    });
  });
});
