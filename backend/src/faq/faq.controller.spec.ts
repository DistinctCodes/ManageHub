import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { FAQController } from './faq.controller';
import { FAQService } from './faq.service';
import { FAQ, FAQCategory, FAQStatus } from './faq.entity';
import { CreateFAQDto } from './dto/create-faq.dto';
import { UpdateFAQDto } from './dto/update-faq.dto';
import { FAQQueryDto } from './dto/faq-query.dto';

describe('FAQController', () => {
  let controller: FAQController;
  let service: FAQService;

  const mockFAQ: FAQ = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    question: 'What is the workspace policy?',
    answer: 'The workspace policy includes...',
    category: FAQCategory.WORKSPACE,
    status: FAQStatus.ACTIVE,
    isActive: true,
    priority: 1,
    viewCount: 5,
    tags: ['workspace', 'policy'],
    metadata: { version: '1.0' },
    createdBy: 'admin',
    updatedBy: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  const mockFAQService = {
    createFAQ: jest.fn(),
    updateFAQ: jest.fn(),
    deleteFAQ: jest.fn(),
    toggleFAQStatus: jest.fn(),
    bulkUpdatePriority: jest.fn(),
    getAllFAQs: jest.fn(),
    getFAQById: jest.fn(),
    getFAQByIdWithViewIncrement: jest.fn(),
    getFAQsByCategory: jest.fn(),
    getPopularFAQs: jest.fn(),
    searchFAQs: jest.fn(),
    getFAQStats: jest.fn(),
    getCategories: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FAQController],
      providers: [
        {
          provide: FAQService,
          useValue: mockFAQService,
        },
      ],
    }).compile();

    controller = module.get<FAQController>(FAQController);
    service = module.get<FAQService>(FAQService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Admin Endpoints', () => {
    describe('createFAQ', () => {
      it('should create a new FAQ', async () => {
        const createFAQDto: CreateFAQDto = {
          question: 'What is the workspace policy?',
          answer: 'The workspace policy includes...',
          category: FAQCategory.WORKSPACE,
          createdBy: 'admin',
        };

        mockFAQService.createFAQ.mockResolvedValue(mockFAQ);

        const result = await controller.createFAQ(createFAQDto);

        expect(mockFAQService.createFAQ).toHaveBeenCalledWith(createFAQDto);
        expect(result).toEqual({
          statusCode: HttpStatus.CREATED,
          message: 'FAQ created successfully',
          data: mockFAQ,
        });
      });
    });

    describe('updateFAQ', () => {
      it('should update an existing FAQ', async () => {
        const updateFAQDto: UpdateFAQDto = {
          answer: 'Updated answer',
          updatedBy: 'admin2',
        };

        const updatedFAQ = { ...mockFAQ, ...updateFAQDto };
        mockFAQService.updateFAQ.mockResolvedValue(updatedFAQ);

        const result = await controller.updateFAQ(mockFAQ.id, updateFAQDto);

        expect(mockFAQService.updateFAQ).toHaveBeenCalledWith(
          mockFAQ.id,
          updateFAQDto,
        );
        expect(result).toEqual({
          statusCode: HttpStatus.OK,
          message: 'FAQ updated successfully',
          data: updatedFAQ,
        });
      });
    });

    describe('deleteFAQ', () => {
      it('should delete an FAQ', async () => {
        mockFAQService.deleteFAQ.mockResolvedValue(undefined);

        const result = await controller.deleteFAQ(mockFAQ.id);

        expect(mockFAQService.deleteFAQ).toHaveBeenCalledWith(mockFAQ.id);
        expect(result).toEqual({
          statusCode: HttpStatus.OK,
          message: 'FAQ deleted successfully',
        });
      });
    });

    describe('toggleFAQStatus', () => {
      it('should toggle FAQ status', async () => {
        const toggledFAQ = { ...mockFAQ, isActive: false };
        mockFAQService.toggleFAQStatus.mockResolvedValue(toggledFAQ);

        const result = await controller.toggleFAQStatus(mockFAQ.id);

        expect(mockFAQService.toggleFAQStatus).toHaveBeenCalledWith(mockFAQ.id);
        expect(result).toEqual({
          statusCode: HttpStatus.OK,
          message: 'FAQ deactivated successfully',
          data: toggledFAQ,
        });
      });
    });

    describe('bulkUpdatePriority', () => {
      it('should bulk update FAQ priorities', async () => {
        const updates = [
          { id: mockFAQ.id, priority: 10 },
          { id: 'another-id', priority: 5 },
        ];

        const updatedFAQs = [
          { ...mockFAQ, priority: 10 },
          { ...mockFAQ, id: 'another-id', priority: 5 },
        ];

        mockFAQService.bulkUpdatePriority.mockResolvedValue(updatedFAQs);

        const result = await controller.bulkUpdatePriority(updates);

        expect(mockFAQService.bulkUpdatePriority).toHaveBeenCalledWith(updates);
        expect(result).toEqual({
          statusCode: HttpStatus.OK,
          message: 'FAQ priorities updated successfully',
          data: updatedFAQs,
        });
      });
    });

    describe('getAllFAQsForAdmin', () => {
      it('should get all FAQs for admin', async () => {
        const queryDto: FAQQueryDto = {
          limit: 10,
          offset: 0,
          category: FAQCategory.WORKSPACE,
        };

        const serviceResult = {
          faqs: [mockFAQ],
          total: 1,
          pagination: {
            limit: 10,
            offset: 0,
            hasMore: false,
          },
        };

        mockFAQService.getAllFAQs.mockResolvedValue(serviceResult);

        const result = await controller.getAllFAQsForAdmin(queryDto);

        expect(mockFAQService.getAllFAQs).toHaveBeenCalledWith({
          ...queryDto,
          isActive: undefined,
        });
        expect(result).toEqual({
          statusCode: HttpStatus.OK,
          message: 'All FAQs retrieved successfully',
          data: serviceResult,
        });
      });
    });

    describe('getFAQStats', () => {
      it('should get FAQ statistics', async () => {
        const stats = {
          total: 10,
          active: 8,
          inactive: 1,
          draft: 1,
          byCategory: { general: 5, workspace: 3 },
          totalViews: 100,
          avgViewsPerFAQ: 12,
        };

        mockFAQService.getFAQStats.mockResolvedValue(stats);

        const result = await controller.getFAQStats();

        expect(mockFAQService.getFAQStats).toHaveBeenCalled();
        expect(result).toEqual({
          statusCode: HttpStatus.OK,
          message: 'FAQ statistics retrieved successfully',
          data: stats,
        });
      });
    });
  });

  describe('Public/User Endpoints', () => {
    describe('getAllFAQs', () => {
      it('should get all public FAQs', async () => {
        const queryDto: FAQQueryDto = {
          limit: 10,
          offset: 0,
          category: FAQCategory.GENERAL,
        };

        const serviceResult = {
          faqs: [mockFAQ],
          total: 1,
          pagination: {
            limit: 10,
            offset: 0,
            hasMore: false,
          },
        };

        mockFAQService.getAllFAQs.mockResolvedValue(serviceResult);

        const result = await controller.getAllFAQs(queryDto);

        expect(mockFAQService.getAllFAQs).toHaveBeenCalledWith(queryDto);
        expect(result).toEqual({
          statusCode: HttpStatus.OK,
          message: 'FAQs retrieved successfully',
          data: serviceResult,
        });
      });
    });

    describe('searchFAQs', () => {
      it('should search FAQs successfully', async () => {
        const searchTerm = 'workspace';
        const searchResults = [mockFAQ];

        mockFAQService.searchFAQs.mockResolvedValue(searchResults);

        const result = await controller.searchFAQs(searchTerm, 10);

        expect(mockFAQService.searchFAQs).toHaveBeenCalledWith(
          searchTerm,
          10,
        );
        expect(result).toEqual({
          statusCode: HttpStatus.OK,
          message: 'FAQ search completed successfully',
          data: searchResults,
        });
      });

      it('should return bad request for short search term', async () => {
        const result = await controller.searchFAQs('a');

        expect(mockFAQService.searchFAQs).not.toHaveBeenCalled();
        expect(result).toEqual({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Search term must be at least 2 characters long',
          data: [],
        });
      });

      it('should return bad request for empty search term', async () => {
        const result = await controller.searchFAQs('  ');

        expect(mockFAQService.searchFAQs).not.toHaveBeenCalled();
        expect(result).toEqual({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Search term must be at least 2 characters long',
          data: [],
        });
      });
    });

    describe('getPopularFAQs', () => {
      it('should get popular FAQs', async () => {
        const popularFAQs = [{ ...mockFAQ, viewCount: 100 }];
        mockFAQService.getPopularFAQs.mockResolvedValue(popularFAQs);

        const result = await controller.getPopularFAQs(5);

        expect(mockFAQService.getPopularFAQs).toHaveBeenCalledWith(5);
        expect(result).toEqual({
          statusCode: HttpStatus.OK,
          message: 'Popular FAQs retrieved successfully',
          data: popularFAQs,
        });
      });

      it('should get popular FAQs with default limit', async () => {
        const popularFAQs = [mockFAQ];
        mockFAQService.getPopularFAQs.mockResolvedValue(popularFAQs);

        const result = await controller.getPopularFAQs();

        expect(mockFAQService.getPopularFAQs).toHaveBeenCalledWith(10);
        expect(result).toEqual({
          statusCode: HttpStatus.OK,
          message: 'Popular FAQs retrieved successfully',
          data: popularFAQs,
        });
      });
    });

    describe('getCategories', () => {
      it('should get all FAQ categories', async () => {
        const categories = Object.values(FAQCategory);
        mockFAQService.getCategories.mockResolvedValue(categories);

        const result = await controller.getCategories();

        expect(mockFAQService.getCategories).toHaveBeenCalled();
        expect(result).toEqual({
          statusCode: HttpStatus.OK,
          message: 'FAQ categories retrieved successfully',
          data: categories,
        });
      });
    });

    describe('getFAQsByCategory', () => {
      it('should get FAQs by category', async () => {
        const categoryFAQs = [mockFAQ];
        mockFAQService.getFAQsByCategory.mockResolvedValue(categoryFAQs);

        const result = await controller.getFAQsByCategory(
          FAQCategory.WORKSPACE,
          15,
        );

        expect(mockFAQService.getFAQsByCategory).toHaveBeenCalledWith(
          FAQCategory.WORKSPACE,
          15,
        );
        expect(result).toEqual({
          statusCode: HttpStatus.OK,
          message: "FAQs for category 'workspace' retrieved successfully",
          data: categoryFAQs,
        });
      });

      it('should get FAQs by category with default limit', async () => {
        const categoryFAQs = [mockFAQ];
        mockFAQService.getFAQsByCategory.mockResolvedValue(categoryFAQs);

        const result = await controller.getFAQsByCategory(
          FAQCategory.GENERAL,
        );

        expect(mockFAQService.getFAQsByCategory).toHaveBeenCalledWith(
          FAQCategory.GENERAL,
          10,
        );
        expect(result).toEqual({
          statusCode: HttpStatus.OK,
          message: "FAQs for category 'general' retrieved successfully",
          data: categoryFAQs,
        });
      });
    });

    describe('getFAQById', () => {
      it('should get FAQ by ID without incrementing view count', async () => {
        mockFAQService.getFAQById.mockResolvedValue(mockFAQ);

        const result = await controller.getFAQById(mockFAQ.id);

        expect(mockFAQService.getFAQById).toHaveBeenCalledWith(mockFAQ.id);
        expect(mockFAQService.getFAQByIdWithViewIncrement).not.toHaveBeenCalled();
        expect(result).toEqual({
          statusCode: HttpStatus.OK,
          message: 'FAQ retrieved successfully',
          data: mockFAQ,
        });
      });

      it('should get FAQ by ID with view count increment', async () => {
        const incrementedFAQ = { ...mockFAQ, viewCount: 6 };
        mockFAQService.getFAQByIdWithViewIncrement.mockResolvedValue(
          incrementedFAQ,
        );

        const result = await controller.getFAQById(mockFAQ.id, 'true');

        expect(mockFAQService.getFAQByIdWithViewIncrement).toHaveBeenCalledWith(
          mockFAQ.id,
        );
        expect(mockFAQService.getFAQById).not.toHaveBeenCalled();
        expect(result).toEqual({
          statusCode: HttpStatus.OK,
          message: 'FAQ retrieved successfully',
          data: incrementedFAQ,
        });
      });

      it('should get FAQ by ID without incrementing when increment is not "true"', async () => {
        mockFAQService.getFAQById.mockResolvedValue(mockFAQ);

        const result = await controller.getFAQById(mockFAQ.id, 'false');

        expect(mockFAQService.getFAQById).toHaveBeenCalledWith(mockFAQ.id);
        expect(mockFAQService.getFAQByIdWithViewIncrement).not.toHaveBeenCalled();
        expect(result).toEqual({
          statusCode: HttpStatus.OK,
          message: 'FAQ retrieved successfully',
          data: mockFAQ,
        });
      });
    });
  });
});
