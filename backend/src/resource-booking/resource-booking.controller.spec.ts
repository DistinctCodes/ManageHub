import { Test, TestingModule } from '@nestjs/testing';
import { ResourceBookingController } from './resource-booking.controller';
import { ResourceBookingService } from './resource-booking.service';

describe('ResourceBookingController', () => {
  let controller: ResourceBookingController;
  let service: ResourceBookingService;

  const mockService = {
    createResource: jest.fn(),
    listResources: jest.fn(),
    createBooking: jest.fn(),
    listBookings: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResourceBookingController],
      providers: [
        { provide: ResourceBookingService, useValue: mockService },
      ],
    }).compile();
    controller = module.get<ResourceBookingController>(ResourceBookingController);
    service = module.get<ResourceBookingService>(ResourceBookingService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should delegate createResource', async () => {
    mockService.createResource.mockResolvedValue({ id: '1' });
    const dto = { name: 'Room 1', type: 'room' };
    const result = await controller.createResource(dto as any);
    expect(service.createResource).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: '1' });
  });

  it('should delegate listResources', async () => {
    mockService.listResources.mockResolvedValue([{ id: '1' }]);
    const result = await controller.listResources();
    expect(service.listResources).toHaveBeenCalled();
    expect(result).toEqual([{ id: '1' }]);
  });

  it('should delegate createBooking', async () => {
    mockService.createBooking.mockResolvedValue({ id: 'b1' });
    const dto = { resourceId: '1', bookedBy: 'A', startTime: '2025-09-03T10:00:00Z', endTime: '2025-09-03T11:00:00Z' };
    const result = await controller.createBooking(dto as any);
    expect(service.createBooking).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 'b1' });
  });

  it('should delegate listBookings', async () => {
    mockService.listBookings.mockResolvedValue([{ id: 'b1' }]);
    const result = await controller.listBookings('1');
    expect(service.listBookings).toHaveBeenCalledWith('1');
    expect(result).toEqual([{ id: 'b1' }]);
  });
});
