import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EventFeedbackService } from './event-feedback.service';
import { EventFeedback, FeedbackStatus } from '../entities/event-feedback.entity';
import { Event } from '../entities/event.entity';
import { EventRsvp } from '../entities/event-rsvp.entity';
import { CreateEventFeedbackDto } from '../dto/create-event-feedback.dto';

describe('EventFeedbackService', () => {
  let service: EventFeedbackService;
  let feedbackRepository: Repository<EventFeedback>;
  let eventRepository: Repository<Event>;
  let rsvpRepository: Repository<EventRsvp>;

  const mockEvent = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Test Event',
    endDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
  };

  const mockRsvp = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    eventId: mockEvent.id,
    attendeeEmail: 'test@example.com',
  };

  const mockFeedback = {
    id: '123e4567-e89b-12d3-a456-426614174002',
    eventId: mockEvent.id,
    rsvpId: mockRsvp.id,
    attendeeName: 'John Doe',
    attendeeEmail: 'test@example.com',
    overallRating: 5,
    contentRating: 4,
    organizationRating: 5,
    venueRating: 4,
    comments: 'Great event!',
    wouldRecommend: true,
    wouldAttendAgain: true,
    status: FeedbackStatus.SUBMITTED,
    submittedAt: new Date(),
    averageRating: 4.5,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventFeedbackService,
        {
          provide: getRepositoryToken(EventFeedback),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            delete: jest.fn(),
            count: jest.fn(),
            query: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Event),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(EventRsvp),
          useValue: {
            findOne: jest.fn(),
            count: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EventFeedbackService>(EventFeedbackService);
    feedbackRepository = module.get<Repository<EventFeedback>>(getRepositoryToken(EventFeedback));
    eventRepository = module.get<Repository<Event>>(getRepositoryToken(Event));
    rsvpRepository = module.get<Repository<EventRsvp>>(getRepositoryToken(EventRsvp));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createFeedback', () => {
    const createFeedbackDto: CreateEventFeedbackDto = {
      eventId: mockEvent.id,
      rsvpId: mockRsvp.id,
      attendeeName: 'John Doe',
      attendeeEmail: 'test@example.com',
      overallRating: 5,
      contentRating: 4,
      organizationRating: 5,
      venueRating: 4,
      comments: 'Great event!',
      wouldRecommend: true,
      wouldAttendAgain: true,
    };

    it('should create feedback successfully', async () => {
      jest.spyOn(eventRepository, 'findOne').mockResolvedValue(mockEvent as Event);
      jest.spyOn(rsvpRepository, 'findOne').mockResolvedValue(mockRsvp as EventRsvp);
      jest.spyOn(feedbackRepository, 'findOne').mockResolvedValue(null); // No existing feedback
      jest.spyOn(feedbackRepository, 'create').mockReturnValue(mockFeedback as EventFeedback);
      jest.spyOn(feedbackRepository, 'save').mockResolvedValue(mockFeedback as EventFeedback);

      const result = await service.createFeedback(createFeedbackDto);

      expect(result).toEqual(mockFeedback);
      expect(feedbackRepository.create).toHaveBeenCalledWith({
        ...createFeedbackDto,
        status: FeedbackStatus.SUBMITTED,
        submittedAt: expect.any(Date),
      });
    });

    it('should throw NotFoundException when event not found', async () => {
      jest.spyOn(eventRepository, 'findOne').mockResolvedValue(null);

      await expect(service.createFeedback(createFeedbackDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when event has not ended', async () => {
      const futureEvent = { ...mockEvent, endDate: new Date(Date.now() + 24 * 60 * 60 * 1000) };
      jest.spyOn(eventRepository, 'findOne').mockResolvedValue(futureEvent as Event);

      await expect(service.createFeedback(createFeedbackDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for duplicate feedback', async () => {
      jest.spyOn(eventRepository, 'findOne').mockResolvedValue(mockEvent as Event);
      jest.spyOn(feedbackRepository, 'findOne').mockResolvedValue(mockFeedback as EventFeedback);

      await expect(service.createFeedback(createFeedbackDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when RSVP not found', async () => {
      jest.spyOn(eventRepository, 'findOne').mockResolvedValue(mockEvent as Event);
      jest.spyOn(rsvpRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(feedbackRepository, 'findOne').mockResolvedValue(null);

      await expect(service.createFeedback(createFeedbackDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getFeedbacksByEvent', () => {
    it('should return feedbacks for an event', async () => {
      const mockFeedbacks = [mockFeedback];
      jest.spyOn(feedbackRepository, 'find').mockResolvedValue(mockFeedbacks as EventFeedback[]);

      const result = await service.getFeedbacksByEvent(mockEvent.id);

      expect(result).toEqual(mockFeedbacks);
      expect(feedbackRepository.find).toHaveBeenCalledWith({
        where: { eventId: mockEvent.id },
        relations: ['event', 'rsvp'],
        order: { submittedAt: 'DESC' }
      });
    });
  });

  describe('getFeedbackById', () => {
    it('should return feedback when found', async () => {
      jest.spyOn(feedbackRepository, 'findOne').mockResolvedValue(mockFeedback as EventFeedback);

      const result = await service.getFeedbackById(mockFeedback.id);

      expect(result).toEqual(mockFeedback);
    });

    it('should throw NotFoundException when feedback not found', async () => {
      jest.spyOn(feedbackRepository, 'findOne').mockResolvedValue(null);

      await expect(service.getFeedbackById('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateFeedbackStatus', () => {
    it('should update feedback status to reviewed', async () => {
      jest.spyOn(service, 'getFeedbackById').mockResolvedValue(mockFeedback as EventFeedback);
      const updatedFeedback = { 
        ...mockFeedback, 
        status: FeedbackStatus.REVIEWED,
        reviewedAt: new Date(),
        reviewedBy: 'admin@example.com',
        reviewNotes: 'Reviewed and approved'
      };
      jest.spyOn(feedbackRepository, 'save').mockResolvedValue(updatedFeedback as EventFeedback);

      const result = await service.updateFeedbackStatus(
        mockFeedback.id,
        FeedbackStatus.REVIEWED,
        'admin@example.com',
        'Reviewed and approved'
      );

      expect(result.status).toBe(FeedbackStatus.REVIEWED);
      expect(result.reviewedBy).toBe('admin@example.com');
      expect(result.reviewNotes).toBe('Reviewed and approved');
      expect(result.reviewedAt).toBeDefined();
    });
  });

  describe('getEventFeedbackAnalytics', () => {
    it('should return analytics for an event with feedbacks', async () => {
      const mockFeedbacks = [
        { ...mockFeedback, overallRating: 5, wouldRecommend: true },
        { ...mockFeedback, overallRating: 4, wouldRecommend: true },
        { ...mockFeedback, overallRating: 3, wouldRecommend: false },
      ];
      jest.spyOn(feedbackRepository, 'find').mockResolvedValue(mockFeedbacks as EventFeedback[]);
      jest.spyOn(rsvpRepository, 'count').mockResolvedValue(10);

      const result = await service.getEventFeedbackAnalytics(mockEvent.id);

      expect(result.totalFeedbacks).toBe(3);
      expect(result.averageOverallRating).toBe(4);
      expect(result.recommendationRate).toBe(66.67);
      expect(result.responseRate).toBe(30);
      expect(result.sentiment).toBe('positive');
    });

    it('should return empty analytics when no feedbacks exist', async () => {
      jest.spyOn(feedbackRepository, 'find').mockResolvedValue([]);

      const result = await service.getEventFeedbackAnalytics(mockEvent.id);

      expect(result.totalFeedbacks).toBe(0);
      expect(result.averageOverallRating).toBe(0);
      expect(result.recommendationRate).toBe(0);
      expect(result.sentiment).toBe('neutral');
    });
  });

  describe('deleteFeedback', () => {
    it('should delete feedback successfully', async () => {
      jest.spyOn(feedbackRepository, 'delete').mockResolvedValue({ affected: 1, raw: {} });

      await service.deleteFeedback(mockFeedback.id);

      expect(feedbackRepository.delete).toHaveBeenCalledWith(mockFeedback.id);
    });

    it('should throw NotFoundException when feedback not found', async () => {
      jest.spyOn(feedbackRepository, 'delete').mockResolvedValue({ affected: 0, raw: {} });

      await expect(service.deleteFeedback('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTopRatedEvents', () => {
    it('should return top rated events', async () => {
      const mockResults = [
        {
          eventId: 'event1',
          eventTitle: 'Great Event',
          totalFeedbacks: 5,
          averageRating: 4.8,
          recommendationRate: 90,
          lastFeedbackDate: new Date(),
        },
        {
          eventId: 'event2',
          eventTitle: 'Good Event',
          totalFeedbacks: 3,
          averageRating: 4.2,
          recommendationRate: 75,
          lastFeedbackDate: new Date(),
        },
      ];
      jest.spyOn(feedbackRepository, 'query').mockResolvedValue(mockResults);

      const result = await service.getTopRatedEvents(10);

      expect(result).toHaveLength(2);
      expect(result[0].eventTitle).toBe('Great Event');
      expect(result[0].averageRating).toBe(4.8);
    });
  });
});