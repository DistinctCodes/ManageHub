import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventService } from './services/event.service';
import { RsvpService } from './services/rsvp.service';
import { Event, EventStatus, EventType } from './entities/event.entity';
import { EventRsvp, RsvpStatus } from './entities/event-rsvp.entity';

describe('EventRsvpModule Integration', () => {
  let eventService: EventService;
  let rsvpService: RsvpService;
  let eventRepository: Repository<Event>;
  let rsvpRepository: Repository<EventRsvp>;

  const mockEventRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
      getOne: jest.fn(),
      select: jest.fn().mockReturnThis(),
      getRawOne: jest.fn(),
      getRawMany: jest.fn(),
      groupBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    })),
  };

  const mockRsvpRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    count: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn(),
      leftJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      getRawMany: jest.fn(),
      groupBy: jest.fn().mockReturnThis(),
    })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventService,
        RsvpService,
        {
          provide: getRepositoryToken(Event),
          useValue: mockEventRepository,
        },
        {
          provide: getRepositoryToken(EventRsvp),
          useValue: mockRsvpRepository,
        },
      ],
    }).compile();

    eventService = module.get<EventService>(EventService);
    rsvpService = module.get<RsvpService>(RsvpService);
    eventRepository = module.get<Repository<Event>>(getRepositoryToken(Event));
    rsvpRepository = module.get<Repository<EventRsvp>>(
      getRepositoryToken(EventRsvp),
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(eventService).toBeDefined();
    expect(rsvpService).toBeDefined();
  });

  describe('Event Creation and Management', () => {
    it('should create a new event', async () => {
      const createEventDto = {
        title: 'Test Workshop',
        description: 'A test workshop for developers',
        eventType: EventType.WORKSHOP,
        startDate: '2024-12-25T10:00:00Z',
        endDate: '2024-12-25T12:00:00Z',
        location: 'Tech Hub Main Hall',
        capacity: 50,
        organizerName: 'John Doe',
        organizerEmail: 'john@techub.com',
      };

      const mockEvent = {
        id: 'event-123',
        ...createEventDto,
        startDate: new Date(createEventDto.startDate),
        endDate: new Date(createEventDto.endDate),
        status: EventStatus.DRAFT,
        confirmedRsvps: 0,
        waitlistCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockEventRepository.create.mockReturnValue(mockEvent);
      mockEventRepository.save.mockResolvedValue(mockEvent);

      const result = await eventService.create(createEventDto);

      expect(mockEventRepository.create).toHaveBeenCalledWith({
        ...createEventDto,
        startDate: new Date(createEventDto.startDate),
        endDate: new Date(createEventDto.endDate),
        registrationDeadline: null,
      });
      expect(mockEventRepository.save).toHaveBeenCalledWith(mockEvent);
      expect(result).toEqual(mockEvent);
    });

    it('should publish a draft event', async () => {
      const mockEvent = {
        id: 'event-123',
        title: 'Test Workshop',
        status: EventStatus.DRAFT,
        startDate: new Date('2024-12-25T10:00:00Z'),
        confirmedRsvps: 0,
      };

      const publishedEvent = {
        ...mockEvent,
        status: EventStatus.PUBLISHED,
      };

      mockEventRepository.findOne.mockResolvedValue(mockEvent);
      mockEventRepository.save.mockResolvedValue(publishedEvent);

      const result = await eventService.publishEvent('event-123');

      expect(result.status).toBe(EventStatus.PUBLISHED);
    });
  });

  describe('RSVP Management', () => {
    it('should create an RSVP for an event', async () => {
      const mockEvent = {
        id: 'event-123',
        title: 'Test Workshop',
        status: EventStatus.PUBLISHED,
        capacity: 50,
        confirmedRsvps: 10,
        registrationDeadline: null,
        startDate: new Date('2024-12-25T10:00:00Z'),
        get registrationOpen() {
          return true;
        },
        get isFullyBooked() {
          return false;
        },
        get canAcceptRsvp() {
          return true;
        },
      };

      const createRsvpDto = {
        attendeeName: 'Jane Smith',
        attendeeEmail: 'jane@example.com',
        attendeePhone: '+1234567890',
        specialRequests: 'Vegetarian meal',
      };

      const mockRsvp = {
        id: 'rsvp-123',
        eventId: 'event-123',
        ...createRsvpDto,
        status: RsvpStatus.CONFIRMED,
        confirmedAt: new Date(),
        createdAt: new Date(),
        event: mockEvent,
      };

      // Mock the service methods
      jest.spyOn(eventService, 'findOne').mockResolvedValue(mockEvent as any);
      jest
        .spyOn(eventService, 'updateRsvpCounts')
        .mockResolvedValue(mockEvent as any);

      mockRsvpRepository.findOne.mockResolvedValue(null); // No existing RSVP
      mockRsvpRepository.create.mockReturnValue(mockRsvp);
      mockRsvpRepository.save.mockResolvedValue(mockRsvp);
      jest.spyOn(rsvpService, 'findOne').mockResolvedValue(mockRsvp as any);

      const result = await rsvpService.createRsvp('event-123', createRsvpDto);

      expect(result.status).toBe(RsvpStatus.CONFIRMED);
      expect(result.attendeeName).toBe(createRsvpDto.attendeeName);
      expect(result.attendeeEmail).toBe(createRsvpDto.attendeeEmail);
    });

    it('should waitlist RSVP when event is full', async () => {
      const mockEvent = {
        id: 'event-123',
        title: 'Test Workshop',
        status: EventStatus.PUBLISHED,
        capacity: 50,
        confirmedRsvps: 50,
        allowWaitlist: true,
        registrationDeadline: null,
        startDate: new Date('2024-12-25T10:00:00Z'),
        get registrationOpen() {
          return true;
        },
        get isFullyBooked() {
          return true;
        },
        get canAcceptRsvp() {
          return true;
        },
      };

      const createRsvpDto = {
        attendeeName: 'Bob Wilson',
        attendeeEmail: 'bob@example.com',
      };

      const mockRsvp = {
        id: 'rsvp-456',
        eventId: 'event-123',
        ...createRsvpDto,
        status: RsvpStatus.WAITLISTED,
        waitlistPosition: 1,
        createdAt: new Date(),
        event: mockEvent,
      };

      jest.spyOn(eventService, 'findOne').mockResolvedValue(mockEvent as any);
      jest
        .spyOn(eventService, 'updateRsvpCounts')
        .mockResolvedValue(mockEvent as any);

      mockRsvpRepository.findOne.mockResolvedValue(null);
      mockRsvpRepository.count.mockResolvedValue(0); // No waitlist
      mockRsvpRepository.create.mockReturnValue(mockRsvp);
      mockRsvpRepository.save.mockResolvedValue(mockRsvp);
      jest.spyOn(rsvpService, 'findOne').mockResolvedValue(mockRsvp as any);

      const result = await rsvpService.createRsvp('event-123', createRsvpDto);

      expect(result.status).toBe(RsvpStatus.WAITLISTED);
      expect(result.waitlistPosition).toBe(1);
    });

    it('should cancel an RSVP', async () => {
      const mockRsvp = {
        id: 'rsvp-123',
        eventId: 'event-123',
        status: RsvpStatus.CONFIRMED,
        attendeeName: 'Jane Smith',
        attendeeEmail: 'jane@example.com',
        get canCancel() {
          return true;
        },
      };

      const cancelledRsvp = {
        ...mockRsvp,
        status: RsvpStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: 'Personal emergency',
      };

      jest.spyOn(rsvpService, 'findOne').mockResolvedValue(mockRsvp as any);
      jest.spyOn(eventService, 'updateRsvpCounts').mockResolvedValue({} as any);
      mockRsvpRepository.save.mockResolvedValue(cancelledRsvp);

      const result = await rsvpService.cancelRsvp(
        'rsvp-123',
        'Personal emergency',
      );

      expect(result.status).toBe(RsvpStatus.CANCELLED);
      expect(result.cancellationReason).toBe('Personal emergency');
    });
  });

  describe('Capacity and Slot Management', () => {
    it('should track available slots correctly', async () => {
      const mockEvent = {
        id: 'event-123',
        capacity: 100,
        confirmedRsvps: 75,
        waitlistCount: 10,
        get availableSlots() {
          return Math.max(0, this.capacity - this.confirmedRsvps);
        },
        get isFullyBooked() {
          return this.confirmedRsvps >= this.capacity;
        },
      };

      mockEventRepository.findOne.mockResolvedValue(mockEvent);

      const result = await eventService.findOne('event-123');

      expect(result.availableSlots).toBe(25);
      expect(result.isFullyBooked).toBe(false);
      expect(result.confirmedRsvps).toBe(75);
      expect(result.waitlistCount).toBe(10);
    });
  });

  describe('Statistics and Analytics', () => {
    it('should get event statistics', async () => {
      const mockStats = {
        totalEvents: 50,
        upcomingEvents: 20,
        pastEvents: 25,
        draftEvents: 5,
        publishedEvents: 40,
        cancelledEvents: 5,
        totalCapacity: 2500,
        totalRsvps: 1800,
        averageCapacityUtilization: 72,
        eventsByType: {
          [EventType.WORKSHOP]: 15,
          [EventType.SEMINAR]: 10,
          [EventType.NETWORKING]: 8,
          [EventType.TRAINING]: 12,
          [EventType.CONFERENCE]: 3,
          [EventType.MEETING]: 2,
          [EventType.SOCIAL]: 0,
          [EventType.OTHER]: 0,
        },
        eventsByMonth: [],
      };

      // Mock the count calls
      mockEventRepository.count
        .mockResolvedValueOnce(50) // totalEvents
        .mockResolvedValueOnce(20) // upcomingEvents
        .mockResolvedValueOnce(25) // pastEvents
        .mockResolvedValueOnce(5) // draftEvents
        .mockResolvedValueOnce(40) // publishedEvents
        .mockResolvedValueOnce(5); // cancelledEvents

      mockEventRepository.createQueryBuilder().getRawOne.mockResolvedValue({
        totalCapacity: '2500',
        totalRsvps: '1800',
      });

      mockEventRepository
        .createQueryBuilder()
        .getRawMany.mockResolvedValueOnce([
          { type: EventType.WORKSHOP, count: '15' },
          { type: EventType.SEMINAR, count: '10' },
          { type: EventType.NETWORKING, count: '8' },
          { type: EventType.TRAINING, count: '12' },
          { type: EventType.CONFERENCE, count: '3' },
          { type: EventType.MEETING, count: '2' },
        ])
        .mockResolvedValueOnce([]); // monthlyStats

      const result = await eventService.getEventStatistics();

      expect(result.totalEvents).toBe(50);
      expect(result.averageCapacityUtilization).toBe(72);
      expect(result.eventsByType[EventType.WORKSHOP]).toBe(15);
    });

    it('should get RSVP statistics', async () => {
      const mockStats = {
        totalRsvps: 1800,
        confirmedRsvps: 1500,
        waitlistedRsvps: 100,
        cancelledRsvps: 150,
        attendedRsvps: 1200,
        noShowRsvps: 50,
      };

      mockRsvpRepository.count
        .mockResolvedValueOnce(1800) // totalRsvps
        .mockResolvedValueOnce(1500) // confirmedRsvps
        .mockResolvedValueOnce(100) // waitlistedRsvps
        .mockResolvedValueOnce(150) // cancelledRsvps
        .mockResolvedValueOnce(1200) // attendedRsvps
        .mockResolvedValueOnce(50); // noShowRsvps

      mockRsvpRepository
        .createQueryBuilder()
        .getRawMany.mockResolvedValueOnce([]) // sourceStats
        .mockResolvedValueOnce([]) // monthlyStats
        .mockResolvedValueOnce([]); // topEventsStats

      const result = await rsvpService.getRsvpStatistics();

      expect(result.totalRsvps).toBe(1800);
      expect(result.confirmedRsvps).toBe(1500);
      expect(result.attendedRsvps).toBe(1200);
    });
  });
});
