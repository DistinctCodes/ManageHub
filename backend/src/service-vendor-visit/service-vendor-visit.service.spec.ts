  describe('advanced features', () => {
    it('should soft-delete a visit', async () => {
      const visit = { id: 'id', deleted: false };
      jest.spyOn(service, 'findOne').mockResolvedValue(visit as any);
      mockRepo.save.mockResolvedValue({ ...visit, deleted: true });
      await service.remove('id');
      expect(mockRepo.save).toHaveBeenCalledWith({ ...visit, deleted: true });
    });

    it('should restore a soft-deleted visit', async () => {
      const visit = { id: 'id', deleted: true };
      jest.spyOn(service, 'findOne').mockResolvedValue(visit as any);
      mockRepo.save.mockResolvedValue({ ...visit, deleted: false });
      const result = await service.restore('id');
      expect(mockRepo.save).toHaveBeenCalledWith({ ...visit, deleted: false });
      expect(result).toEqual({ ...visit, deleted: false });
    });

    it('should update status', async () => {
      const visit = { id: 'id', status: 'Scheduled' };
      jest.spyOn(service, 'findOne').mockResolvedValue(visit as any);
      mockRepo.save.mockResolvedValue({ ...visit, status: 'Completed' });
      const result = await service.update('id', { status: 'Completed' } as any);
      expect(result).toEqual({ ...visit, status: 'Completed' });
    });

    it('should filter by status and showDeleted in findAll', async () => {
      const qb: any = {
        andWhere: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[{ id: 'id' }], 1]),
      };
      mockRepo.createQueryBuilder.mockReturnValue(qb);
      const result = await service.findAll({ page: 1, limit: 10, status: 'Completed', showDeleted: true } as any);
      expect(qb.andWhere).toHaveBeenCalledWith('visit.deleted = false');
      expect(qb.andWhere).toHaveBeenCalledWith('visit.status = :status', { status: 'Completed' });
      expect(result.data).toEqual([{ id: 'id' }]);
    });
  });

import { Test, TestingModule } from '@nestjs/testing';
import { ServiceVendorVisitService } from './service-vendor-visit.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ServiceVendorVisit } from './entities/service-vendor-visit.entity';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';

describe('ServiceVendorVisitService', () => {
  let service: ServiceVendorVisitService;
  let repo: Repository<ServiceVendorVisit>;

  const mockRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceVendorVisitService,
        { provide: getRepositoryToken(ServiceVendorVisit), useValue: mockRepo },
      ],
    }).compile();
    service = module.get<ServiceVendorVisitService>(ServiceVendorVisitService);
    repo = module.get<Repository<ServiceVendorVisit>>(getRepositoryToken(ServiceVendorVisit));
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and save a visit', async () => {
      const dto = { companyName: 'A', personName: 'B', service: 'C', visitTime: '2025-09-03T10:00:00Z' };
      const entity = { ...dto, visitTime: new Date(dto.visitTime) };
      mockRepo.create.mockReturnValue(entity);
      mockRepo.save.mockResolvedValue(entity);
      const result = await service.create(dto as any);
      expect(mockRepo.create).toHaveBeenCalledWith({ ...dto, visitTime: new Date(dto.visitTime) });
      expect(mockRepo.save).toHaveBeenCalledWith(entity);
      expect(result).toEqual(entity);
    });
  });

  describe('findOne', () => {
    it('should throw if not found', async () => {
      mockRepo.findOne.mockResolvedValue(undefined);
      await expect(service.findOne('id')).rejects.toThrow(NotFoundException);
    });
    it('should return visit if found', async () => {
      const visit = { id: 'id', companyName: 'A' };
      mockRepo.findOne.mockResolvedValue(visit);
      const result = await service.findOne('id');
      expect(result).toEqual(visit);
    });
  });

  describe('update', () => {
    it('should update and save a visit', async () => {
      const visit = { id: 'id', companyName: 'A', visitTime: new Date() };
      const updateDto = { companyName: 'B', visitTime: '2025-09-03T12:00:00Z' };
      jest.spyOn(service, 'findOne').mockResolvedValue(visit as any);
      mockRepo.save.mockResolvedValue({ ...visit, ...updateDto, visitTime: new Date(updateDto.visitTime) });
      const result = await service.update('id', updateDto as any);
      expect(result).toEqual({ ...visit, ...updateDto, visitTime: new Date(updateDto.visitTime) });
    });
  });

  describe('remove', () => {
    it('should remove a visit', async () => {
      const visit = { id: 'id' };
      jest.spyOn(service, 'findOne').mockResolvedValue(visit as any);
      mockRepo.remove.mockResolvedValue(visit);
      await expect(service.remove('id')).resolves.toBeUndefined();
      expect(mockRepo.remove).toHaveBeenCalledWith(visit);
    });
  });

  describe('getVisitStats', () => {
    it('should return stats', async () => {
      mockRepo.count.mockResolvedValue(10);
      const qb: any = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([{ companyName: 'A', visitCount: 5 }]),
      };
      mockRepo.createQueryBuilder.mockReturnValue(qb);
      const result = await service.getVisitStats();
      expect(result).toHaveProperty('totalVisits', 10);
      expect(result).toHaveProperty('topCompanies');
      expect(result).toHaveProperty('topServices');
    });
  });
});
