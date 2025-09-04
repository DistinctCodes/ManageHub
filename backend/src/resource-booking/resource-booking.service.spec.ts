import { Test, TestingModule } from '@nestjs/testing';
import { ResourceBookingService } from './resource-booking.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Resource } from './entities/resource.entity';
import { Booking } from './entities/booking.entity';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ResourceBookingService', () => {
  let service: ResourceBookingService;
  let resourceRepo: Repository<Resource>;
  let bookingRepo: Repository<Booking>;

  const mockResourceRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };
  const mockBookingRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResourceBookingService,
        { provide: getRepositoryToken(Resource), useValue: mockResourceRepo },
        { provide: getRepositoryToken(Booking), useValue: mockBookingRepo },
      ],
    }).compile();
    service = module.get<ResourceBookingService>(ResourceBookingService);
    resourceRepo = module.get<Repository<Resource>>(getRepositoryToken(Resource));
    bookingRepo = module.get<Repository<Booking>>(getRepositoryToken(Booking));
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createResource', () => {
    it('should create and save a resource', async () => {
      const dto = { name: 'Room 1', type: 'room' };
      const entity = { ...dto };
      mockResourceRepo.create.mockReturnValue(entity);
      mockResourceRepo.save.mockResolvedValue(entity);
      const result = await service.createResource(dto as any);
      expect(mockResourceRepo.create).toHaveBeenCalledWith(dto);
      expect(mockResourceRepo.save).toHaveBeenCalledWith(entity);
      expect(result).toEqual(entity);
    });
  });

  describe('listResources', () => {
    it('should return all resources', async () => {
      mockResourceRepo.find.mockResolvedValue([{ id: '1', name: 'Room 1' }]);
      const result = await service.listResources();
      expect(result).toEqual([{ id: '1', name: 'Room 1' }]);
    });
  });

  describe('createBooking', () => {
    it('should throw if resource not found', async () => {
      mockResourceRepo.findOne.mockResolvedValue(undefined);
      await expect(service.createBooking({ resourceId: '1', bookedBy: 'A', startTime: '2025-09-03T10:00:00Z', endTime: '2025-09-03T11:00:00Z' } as any)).rejects.toThrow(NotFoundException);
    });
    it('should throw if overlap exists', async () => {
      mockResourceRepo.findOne.mockResolvedValue({ id: '1' });
      mockBookingRepo.findOne.mockResolvedValue({ id: 'b1' });
      await expect(service.createBooking({ resourceId: '1', bookedBy: 'A', startTime: '2025-09-03T10:00:00Z', endTime: '2025-09-03T11:00:00Z' } as any)).rejects.toThrow(BadRequestException);
    });
    it('should create and save booking if no overlap', async () => {
      mockResourceRepo.findOne.mockResolvedValue({ id: '1' });
      mockBookingRepo.findOne.mockResolvedValue(undefined);
      const dto = { resourceId: '1', bookedBy: 'A', startTime: '2025-09-03T10:00:00Z', endTime: '2025-09-03T11:00:00Z' };
      const entity = { ...dto, startTime: new Date(dto.startTime), endTime: new Date(dto.endTime) };
      mockBookingRepo.create.mockReturnValue(entity);
      mockBookingRepo.save.mockResolvedValue(entity);
      const result = await service.createBooking(dto as any);
      expect(mockBookingRepo.create).toHaveBeenCalledWith(entity);
      expect(mockBookingRepo.save).toHaveBeenCalledWith(entity);
      expect(result).toEqual(entity);
    });
  });

  describe('listBookings', () => {
    it('should return all bookings if no resourceId', async () => {
      mockBookingRepo.find.mockResolvedValue([{ id: 'b1' }]);
      const result = await service.listBookings();
      expect(result).toEqual([{ id: 'b1' }]);
    });
    it('should return bookings for a resource', async () => {
      mockBookingRepo.find.mockResolvedValue([{ id: 'b2', resourceId: '1' }]);
      const result = await service.listBookings('1');
      expect(result).toEqual([{ id: 'b2', resourceId: '1' }]);
    });
  });
});
