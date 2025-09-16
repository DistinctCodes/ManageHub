import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as request from 'supertest';
import { EventRsvpController } from './event-rsvp.controller';
import { EventService } from './services/event.service';
import { RsvpService } from './services/rsvp.service';
import { EventTemplateService } from './services/event-template.service';
import { EventFeedbackService } from './services/event-feedback.service';
import { EventRegistrationService } from './services/event-registration.service';
import { EventReminderService } from './services/event-reminder.service';
import { Event, EventStatus } from './entities/event.entity';
import { EventRsvp, RsvpStatus } from './entities/event-rsvp.entity';
import {
  EventFeedback,
  FeedbackStatus,
} from './entities/event-feedback.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { CreateRsvpDto } from './dto/create-rsvp.dto';
import { CreateEventFeedbackDto } from './dto/create-event-feedback.dto';

describe('EventRsvpController (Integration)', () => {
  let app: INestApplication;
  let eventService: EventService;
  let rsvpService: RsvpService;
  let feedbackService: EventFeedbackService;
  let registrationService: EventRegistrationService;
  let reminderService: EventReminderService;

  const mockEvent = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Test Event',
    description: 'A test event for integration testing',
    startDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    endDate: new Date(Date.now() + 25 * 60 * 60 * 1000),
    location: 'Test Venue',
    capacity: 50,
    organizerName: 'John Organizer',
    organizerEmail: 'organizer@example.com',
    status: EventStatus.PUBLISHED,
    confirmedRsvps: 0,
    availableSlots: 50,
    waitlistCount: 0,
    isFullyBooked: false,
    canAcceptRsvp: true,
  };

  const mockRsvp = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    eventId: mockEvent.id,
    attendeeName: 'John Doe',
    attendeeEmail: 'john@example.com',
    attendeePhone: '+1234567890',
    status: RsvpStatus.CONFIRMED,
    specialRequests: 'Vegetarian meal',
    isConfirmed: true,
    isWaitlisted: false,
    isCancelled: false,
    hasAttended: false,
  };

  const mockFeedback = {
    id: '123e4567-e89b-12d3-a456-426614174002',
    eventId: mockEvent.id,
    rsvpId: mockRsvp.id,
    attendeeName: 'John Doe',
    attendeeEmail: 'john@example.com',
    overallRating: 5,
    contentRating: 4,
    organizationRating: 5,
    venueRating: 4,
    comments: 'Great event!',
    wouldRecommend: true,
    wouldAttendAgain: true,
    status: FeedbackStatus.SUBMITTED,
    averageRating: 4.5,
  };

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [EventRsvpController],
      providers: [
        {
          provide: EventService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            publishEvent: jest.fn(),
            cancelEvent: jest.fn(),
            getEventStatistics: jest.fn(),
            getUpcomingEvents: jest.fn(),
            getEventsByOrganizer: jest.fn(),
          },
        },
        {
          provide: RsvpService,
          useValue: {
            createRsvp: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            cancelRsvp: jest.fn(),
            checkInAttendee: jest.fn(),
            markAsNoShow: jest.fn(),
            getEventRsvps: jest.fn(),
            getWaitlist: jest.fn(),
            getRsvpStatistics: jest.fn(),
          },
        },
        {
          provide: EventTemplateService,
          useValue: {
            createTemplate: jest.fn(),
            getTemplateList: jest.fn(),
            findTemplate: jest.fn(),
            createEventFromTemplate: jest.fn(),
            createEventSeries: jest.fn(),
            getSeriesList: jest.fn(),
            findSeries: jest.fn(),
            pauseSeries: jest.fn(),
            resumeSeries: jest.fn(),
            cancelSeries: jest.fn(),
            processRecurringEvents: jest.fn(),
          },
        },
        {
          provide: EventFeedbackService,
          useValue: {
            createFeedback: jest.fn(),
            getFeedbacksByEvent: jest.fn(),
            getFeedbackById: jest.fn(),
            updateFeedbackStatus: jest.fn(),
            deleteFeedback: jest.fn(),
            getEventFeedbackAnalytics: jest.fn(),
            getFeedbackSummaryByDateRange: jest.fn(),
            getPendingFeedbacks: jest.fn(),
            getTopRatedEvents: jest.fn(),
          },
        },
        {
          provide: EventRegistrationService,
          useValue: {
            createForm: jest.fn(),
            getFormsByEvent: jest.fn(),
            getForms: jest.fn(),
            getFormById: jest.fn(),
            updateForm: jest.fn(),
            publishForm: jest.fn(),
            archiveForm: jest.fn(),
            deleteForm: jest.fn(),
            getFormAnalytics: jest.fn(),
            submitResponse: jest.fn(),
            getResponses: jest.fn(),
            getResponseById: jest.fn(),
            updateResponse: jest.fn(),
            bulkUpdateResponses: jest.fn(),
            deleteResponse: jest.fn(),
          },
        },
        {
          provide: EventReminderService,
          useValue: {
            sendCustomReminder: jest.fn(),
            processReminders: jest.fn(),
            getReminderLogs: jest.fn(),
            getReminderStatistics: jest.fn(),
          },
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    eventService = moduleFixture.get<EventService>(EventService);
    rsvpService = moduleFixture.get<RsvpService>(RsvpService);
    feedbackService =
      moduleFixture.get<EventFeedbackService>(EventFeedbackService);
    registrationService = moduleFixture.get<EventRegistrationService>(
      EventRegistrationService,
    );
    reminderService =
      moduleFixture.get<EventReminderService>(EventReminderService);
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Event Management', () => {
    describe('POST /event-rsvp/events', () => {
      it('should create an event', async () => {
        const createEventDto: CreateEventDto = {
          title: 'Test Event',
          description: 'A test event',
          startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
          location: 'Test Venue',
          capacity: 50,
          organizerName: 'John Organizer',
          organizerEmail: 'organizer@example.com',
        };

        jest
          .spyOn(eventService, 'create')
          .mockResolvedValue(mockEvent as Event);

        const response = await request(app.getHttpServer())
          .post('/event-rsvp/events')
          .send(createEventDto)
          .expect(201);

        expect(response.body).toEqual(mockEvent);
        expect(eventService.create).toHaveBeenCalledWith(createEventDto);
      });

      it('should validate required fields', async () => {
        const invalidDto = {
          description: 'Missing required fields',
        };

        await request(app.getHttpServer())
          .post('/event-rsvp/events')
          .send(invalidDto)
          .expect(400);
      });
    });

    describe('GET /event-rsvp/events', () => {
      it('should return all events', async () => {
        const mockEvents = {
          events: [mockEvent],
          total: 1,
          page: 1,
          limit: 10,
        } as any;
        jest.spyOn(eventService, 'findAll').mockResolvedValue(mockEvents);

        const response = await request(app.getHttpServer())
          .get('/event-rsvp/events')
          .expect(200);

        expect(response.body).toEqual(mockEvents);
      });

      it('should handle query parameters', async () => {
        const mockEvents = {
          events: [mockEvent],
          total: 1,
          page: 1,
          limit: 5,
        } as any;
        jest.spyOn(eventService, 'findAll').mockResolvedValue(mockEvents);

        await request(app.getHttpServer())
          .get('/event-rsvp/events?limit=5&status=published')
          .expect(200);

        expect(eventService.findAll).toHaveBeenCalledWith({
          limit: 5,
          status: 'published',
        });
      });
    });

    describe('GET /event-rsvp/events/:id', () => {
      it('should return a specific event', async () => {
        jest
          .spyOn(eventService, 'findOne')
          .mockResolvedValue(mockEvent as Event);

        const response = await request(app.getHttpServer())
          .get(`/event-rsvp/events/${mockEvent.id}`)
          .expect(200);

        expect(response.body).toEqual(mockEvent);
      });

      it('should handle invalid UUID format', async () => {
        await request(app.getHttpServer())
          .get('/event-rsvp/events/invalid-uuid')
          .expect(400);
      });
    });

    describe('POST /event-rsvp/events/:id/publish', () => {
      it('should publish an event', async () => {
        const publishedEvent = { ...mockEvent, status: EventStatus.PUBLISHED };
        jest
          .spyOn(eventService, 'publishEvent')
          .mockResolvedValue(publishedEvent as Event);

        const response = await request(app.getHttpServer())
          .post(`/event-rsvp/events/${mockEvent.id}/publish`)
          .expect(200);

        expect(response.body).toEqual(publishedEvent);
      });
    });

    describe('POST /event-rsvp/events/:id/cancel', () => {
      it('should cancel an event', async () => {
        const cancelledEvent = { ...mockEvent, status: EventStatus.CANCELLED };
        jest
          .spyOn(eventService, 'cancelEvent')
          .mockResolvedValue(cancelledEvent as Event);

        const response = await request(app.getHttpServer())
          .post(`/event-rsvp/events/${mockEvent.id}/cancel`)
          .send({ reason: 'Test cancellation' })
          .expect(200);

        expect(response.body).toEqual(cancelledEvent);
        expect(eventService.cancelEvent).toHaveBeenCalledWith(
          mockEvent.id,
          'Test cancellation',
        );
      });
    });
  });

  describe('RSVP Management', () => {
    describe('POST /event-rsvp/events/:eventId/rsvp', () => {
      it('should create an RSVP', async () => {
        const createRsvpDto: CreateRsvpDto = {
          attendeeName: 'John Doe',
          attendeeEmail: 'john@example.com',
          attendeePhone: '+1234567890',
          specialRequests: 'Vegetarian meal',
        };

        jest
          .spyOn(rsvpService, 'createRsvp')
          .mockResolvedValue(mockRsvp as EventRsvp);

        const response = await request(app.getHttpServer())
          .post(`/event-rsvp/events/${mockEvent.id}/rsvp`)
          .send(createRsvpDto)
          .expect(201);

        expect(response.body).toEqual(mockRsvp);
        expect(rsvpService.createRsvp).toHaveBeenCalledWith(
          mockEvent.id,
          createRsvpDto,
        );
      });
    });

    describe('GET /event-rsvp/events/:eventId/rsvps', () => {
      it('should return RSVPs for an event', async () => {
        const mockRsvps = [mockRsvp];
        jest
          .spyOn(rsvpService, 'getEventRsvps')
          .mockResolvedValue(mockRsvps as EventRsvp[]);

        const response = await request(app.getHttpServer())
          .get(`/event-rsvp/events/${mockEvent.id}/rsvps`)
          .expect(200);

        expect(response.body).toEqual(mockRsvps);
      });
    });

    describe('POST /event-rsvp/rsvps/:id/checkin', () => {
      it('should check in an attendee', async () => {
        const checkedInRsvp = { ...mockRsvp, hasAttended: true };
        jest
          .spyOn(rsvpService, 'checkInAttendee')
          .mockResolvedValue(checkedInRsvp as EventRsvp);

        const response = await request(app.getHttpServer())
          .post(`/event-rsvp/rsvps/${mockRsvp.id}/checkin`)
          .expect(200);

        expect(response.body).toEqual(checkedInRsvp);
      });
    });
  });

  describe('Event Feedback', () => {
    describe('POST /event-rsvp/events/:eventId/feedback', () => {
      it('should submit feedback', async () => {
        const createFeedbackDto: CreateEventFeedbackDto = {
          eventId: mockEvent.id,
          rsvpId: mockRsvp.id,
          attendeeName: 'John Doe',
          attendeeEmail: 'john@example.com',
          overallRating: 5,
          contentRating: 4,
          organizationRating: 5,
          venueRating: 4,
          comments: 'Great event!',
          wouldRecommend: true,
          wouldAttendAgain: true,
        };

        jest
          .spyOn(feedbackService, 'createFeedback')
          .mockResolvedValue(mockFeedback as EventFeedback);

        const response = await request(app.getHttpServer())
          .post(`/event-rsvp/events/${mockEvent.id}/feedback`)
          .send(createFeedbackDto)
          .expect(201);

        expect(response.body).toEqual(mockFeedback);
      });
    });

    describe('GET /event-rsvp/events/:eventId/feedback/analytics', () => {
      it('should return feedback analytics', async () => {
        const mockAnalytics = {
          totalFeedbacks: 5,
          averageOverallRating: 4.5,
          recommendationRate: 80,
          responseRate: 50,
          sentiment: 'positive',
        };
        jest
          .spyOn(feedbackService, 'getEventFeedbackAnalytics')
          .mockResolvedValue(mockAnalytics as any);

        const response = await request(app.getHttpServer())
          .get(`/event-rsvp/events/${mockEvent.id}/feedback/analytics`)
          .expect(200);

        expect(response.body).toEqual(mockAnalytics);
      });
    });

    describe('GET /event-rsvp/feedback/top-rated-events', () => {
      it('should return top rated events', async () => {
        const mockTopEvents = [
          {
            eventId: mockEvent.id,
            eventTitle: mockEvent.title,
            averageRating: 4.5,
            totalFeedbacks: 10,
          },
        ];
        jest
          .spyOn(feedbackService, 'getTopRatedEvents')
          .mockResolvedValue(mockTopEvents as any);

        const response = await request(app.getHttpServer())
          .get('/event-rsvp/feedback/top-rated-events?limit=5')
          .expect(200);

        expect(response.body).toEqual(mockTopEvents);
        expect(feedbackService.getTopRatedEvents).toHaveBeenCalledWith(5);
      });
    });
  });

  describe('Registration Forms', () => {
    describe('POST /event-rsvp/events/:eventId/registration-form', () => {
      it('should create a registration form', async () => {
        const createFormDto = {
          eventId: mockEvent.id,
          name: 'Event Registration',
          fields: [
            {
              id: 'field1',
              type: 'text',
              name: 'firstName',
              label: 'First Name',
              required: true,
              order: 1,
            },
          ],
          createdBy: 'admin@example.com',
        };

        const mockForm = {
          id: 'form-id',
          ...createFormDto,
        };

        jest
          .spyOn(registrationService, 'createForm')
          .mockResolvedValue(mockForm as any);

        const response = await request(app.getHttpServer())
          .post(`/event-rsvp/events/${mockEvent.id}/registration-form`)
          .send(createFormDto)
          .expect(201);

        expect(response.body).toEqual(mockForm);
      });
    });

    describe('GET /event-rsvp/registration-forms/:id/analytics', () => {
      it('should return form analytics', async () => {
        const mockAnalytics = {
          totalResponses: 25,
          submittedResponses: 20,
          approvedResponses: 18,
          averageCompletionTime: 120000,
          responseRate: 80,
        };

        jest
          .spyOn(registrationService, 'getFormAnalytics')
          .mockResolvedValue(mockAnalytics as any);

        const response = await request(app.getHttpServer())
          .get('/event-rsvp/registration-forms/form-id/analytics')
          .expect(200);

        expect(response.body).toEqual(mockAnalytics);
      });
    });
  });

  describe('Event Reminders', () => {
    describe('POST /event-rsvp/events/:eventId/reminders/send', () => {
      it('should send custom reminder', async () => {
        const reminderData = {
          type: 'reminder',
          recipientEmails: ['john@example.com'],
          customMessage: "Don't forget about tomorrow's event!",
        };

        const mockResult = {
          sent: 1,
          failed: 0,
          errors: [],
        };

        jest
          .spyOn(reminderService, 'sendCustomReminder')
          .mockResolvedValue(mockResult);

        const response = await request(app.getHttpServer())
          .post(`/event-rsvp/events/${mockEvent.id}/reminders/send`)
          .send(reminderData)
          .expect(200);

        expect(response.body).toEqual(mockResult);
      });
    });

    describe('GET /event-rsvp/reminders/statistics', () => {
      it('should return reminder statistics', async () => {
        const mockStats = {
          totalSent: 100,
          successRate: 95,
          remindersByType: {
            reminder: 50,
            early_reminder: 30,
            final_reminder: 20,
          },
          recentActivity: [],
        };

        jest
          .spyOn(reminderService, 'getReminderStatistics')
          .mockResolvedValue(mockStats as any);

        const response = await request(app.getHttpServer())
          .get('/event-rsvp/reminders/statistics')
          .expect(200);

        expect(response.body).toEqual(mockStats);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      jest
        .spyOn(eventService, 'findOne')
        .mockRejectedValue(new Error('Database error'));

      await request(app.getHttpServer())
        .get(`/event-rsvp/events/${mockEvent.id}`)
        .expect(500);
    });

    it('should validate UUID parameters', async () => {
      await request(app.getHttpServer())
        .get('/event-rsvp/events/not-a-uuid')
        .expect(400);
    });

    it('should handle missing request body', async () => {
      await request(app.getHttpServer()).post('/event-rsvp/events').expect(400);
    });
  });
});
