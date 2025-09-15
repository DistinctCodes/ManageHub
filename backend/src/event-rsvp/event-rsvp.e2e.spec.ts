import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as request from 'supertest';
import { EventRsvpModule } from './event-rsvp.module';
import { Event, EventStatus } from './entities/event.entity';
import { EventRsvp, RsvpStatus } from './entities/event-rsvp.entity';
import { EventFeedback, FeedbackStatus } from './entities/event-feedback.entity';
import { EventRegistrationForm } from './entities/event-registration-form.entity';
import { EventRegistrationResponse, ResponseStatus } from './entities/event-registration-response.entity';
import { FieldType, ValidationRule } from './entities/event-registration-form.entity';

describe('Event RSVP System E2E', () => {
  let app: INestApplication;
  let eventRepository: Repository<Event>;
  let rsvpRepository: Repository<EventRsvp>;
  let feedbackRepository: Repository<EventFeedback>;
  let formRepository: Repository<EventRegistrationForm>;
  let responseRepository: Repository<EventRegistrationResponse>;

  let createdEventId: string;
  let createdRsvpId: string;
  let createdFormId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [Event, EventRsvp, EventFeedback, EventRegistrationForm, EventRegistrationResponse],
          synchronize: true,
          logging: false,
        }),
        EventRsvpModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    // Get repositories for direct database operations
    eventRepository = moduleFixture.get<Repository<Event>>(getRepositoryToken(Event));
    rsvpRepository = moduleFixture.get<Repository<EventRsvp>>(getRepositoryToken(EventRsvp));
    feedbackRepository = moduleFixture.get<Repository<EventFeedback>>(getRepositoryToken(EventFeedback));
    formRepository = moduleFixture.get<Repository<EventRegistrationForm>>(getRepositoryToken(EventRegistrationForm));
    responseRepository = moduleFixture.get<Repository<EventRegistrationResponse>>(getRepositoryToken(EventRegistrationResponse));
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete Event Lifecycle', () => {
    it('should create an event', async () => {
      const createEventDto = {
        title: 'Tech Conference 2024',
        description: 'Annual technology conference with industry experts',
        startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 8 * 60 * 60 * 1000).toISOString(), // 8 hours later
        location: 'Convention Center, Downtown',
        capacity: 100,
        organizerName: 'John Smith',
        organizerEmail: 'john.smith@example.com',
        tags: ['technology', 'conference', 'networking'],
        eventType: 'conference',
      };

      const response = await request(app.getHttpServer())
        .post('/event-rsvp/events')
        .send(createEventDto)
        .expect(201);

      expect(response.body).toMatchObject({
        title: createEventDto.title,
        description: createEventDto.description,
        location: createEventDto.location,
        capacity: createEventDto.capacity,
        organizerName: createEventDto.organizerName,
        organizerEmail: createEventDto.organizerEmail,
        status: EventStatus.DRAFT,
      });

      createdEventId = response.body.id;
      expect(createdEventId).toBeDefined();
    });

    it('should create a registration form for the event', async () => {
      const createFormDto = {
        eventId: createdEventId,
        name: 'Conference Registration Form',
        description: 'Please fill out this form to register for the conference',
        fields: [
          {
            id: 'firstName',
            type: FieldType.TEXT,
            name: 'firstName',
            label: 'First Name',
            placeholder: 'Enter your first name',
            required: true,
            order: 1,
            validation: [
              {
                rule: ValidationRule.REQUIRED,
                message: 'First name is required'
              },
              {
                rule: ValidationRule.MIN_LENGTH,
                value: 2,
                message: 'First name must be at least 2 characters'
              }
            ]
          },
          {
            id: 'lastName',
            type: FieldType.TEXT,
            name: 'lastName',
            label: 'Last Name',
            placeholder: 'Enter your last name',
            required: true,
            order: 2,
            validation: [
              {
                rule: ValidationRule.REQUIRED,
                message: 'Last name is required'
              }
            ]
          },
          {
            id: 'email',
            type: FieldType.EMAIL,
            name: 'email',
            label: 'Email Address',
            placeholder: 'Enter your email address',
            required: true,
            order: 3,
            validation: [
              {
                rule: ValidationRule.EMAIL,
                message: 'Please enter a valid email address'
              }
            ]
          },
          {
            id: 'company',
            type: FieldType.TEXT,
            name: 'company',
            label: 'Company',
            placeholder: 'Enter your company name',
            required: false,
            order: 4
          },
          {
            id: 'experience',
            type: FieldType.SELECT,
            name: 'experience',
            label: 'Years of Experience',
            required: true,
            order: 5,
            options: [
              { value: '0-2', label: '0-2 years' },
              { value: '3-5', label: '3-5 years' },
              { value: '6-10', label: '6-10 years' },
              { value: '10+', label: '10+ years' }
            ]
          },
          {
            id: 'dietary',
            type: FieldType.MULTI_SELECT,
            name: 'dietary',
            label: 'Dietary Restrictions',
            required: false,
            order: 6,
            options: [
              { value: 'none', label: 'No restrictions' },
              { value: 'vegetarian', label: 'Vegetarian' },
              { value: 'vegan', label: 'Vegan' },
              { value: 'gluten-free', label: 'Gluten-free' },
              { value: 'halal', label: 'Halal' },
              { value: 'kosher', label: 'Kosher' }
            ]
          }
        ],
        settings: {
          theme: {
            primaryColor: '#007bff',
            backgroundColor: '#f8f9fa'
          },
          submission: {
            allowMultiple: false,
            requireLogin: false,
            captcha: false
          }
        },
        createdBy: 'john.smith@example.com'
      };

      const response = await request(app.getHttpServer())
        .post(`/event-rsvp/events/${createdEventId}/registration-form`)
        .send(createFormDto)
        .expect(201);

      expect(response.body).toMatchObject({
        name: createFormDto.name,
        description: createFormDto.description,
        eventId: createdEventId,
        fields: expect.arrayContaining([
          expect.objectContaining({
            id: 'firstName',
            type: FieldType.TEXT,
            required: true
          }),
          expect.objectContaining({
            id: 'email',
            type: FieldType.EMAIL,
            required: true
          }),
          expect.objectContaining({
            id: 'experience',
            type: FieldType.SELECT,
            options: expect.any(Array)
          })
        ]),
        status: 'draft',
        isActive: true
      });

      createdFormId = response.body.id;
      expect(createdFormId).toBeDefined();
    });

    it('should publish the registration form', async () => {
      const response = await request(app.getHttpServer())
        .post(`/event-rsvp/registration-forms/${createdFormId}/publish`)
        .expect(200);

      expect(response.body.status).toBe('published');
      expect(response.body.isActive).toBe(true);
    });

    it('should publish the event', async () => {
      const response = await request(app.getHttpServer())
        .post(`/event-rsvp/events/${createdEventId}/publish`)
        .expect(200);

      expect(response.body.status).toBe(EventStatus.PUBLISHED);
    });

    it('should submit a registration form response', async () => {
      const responseDto = {
        eventId: createdEventId,
        formId: createdFormId,
        respondentName: 'Alice Johnson',
        respondentEmail: 'alice.johnson@example.com',
        responses: {
          firstName: 'Alice',
          lastName: 'Johnson',
          email: 'alice.johnson@example.com',
          company: 'Tech Corp Inc',
          experience: '3-5',
          dietary: ['vegetarian', 'gluten-free']
        }
      };

      const response = await request(app.getHttpServer())
        .post(`/event-rsvp/registration-forms/${createdFormId}/responses`)
        .send(responseDto)
        .expect(201);

      expect(response.body).toMatchObject({
        eventId: createdEventId,
        formId: createdFormId,
        respondentName: 'Alice Johnson',
        respondentEmail: 'alice.johnson@example.com',
        status: ResponseStatus.SUBMITTED,
        isValid: true
      });

      expect(response.body.responses).toEqual(responseDto.responses);
    });

    it('should create an RSVP for the event', async () => {
      const createRsvpDto = {
        attendeeName: 'Alice Johnson',
        attendeeEmail: 'alice.johnson@example.com',
        attendeePhone: '+1-555-0123',
        specialRequests: 'Vegetarian meal, ground floor seating preferred',
      };

      const response = await request(app.getHttpServer())
        .post(`/event-rsvp/events/${createdEventId}/rsvp`)
        .send(createRsvpDto)
        .expect(201);

      expect(response.body).toMatchObject({
        eventId: createdEventId,
        attendeeName: createRsvpDto.attendeeName,
        attendeeEmail: createRsvpDto.attendeeEmail,
        attendeePhone: createRsvpDto.attendeePhone,
        specialRequests: createRsvpDto.specialRequests,
        status: RsvpStatus.CONFIRMED,
      });

      createdRsvpId = response.body.id;
      expect(createdRsvpId).toBeDefined();
    });

    it('should check in the attendee', async () => {
      const response = await request(app.getHttpServer())
        .post(`/event-rsvp/rsvps/${createdRsvpId}/checkin`)
        .expect(200);

      expect(response.body.status).toBe(RsvpStatus.ATTENDED);
      expect(response.body.checkedInAt).toBeDefined();
    });

    it('should mark the event as completed', async () => {
      // Manually update the event to completed status for testing feedback
      await eventRepository.update(createdEventId, {
        status: EventStatus.COMPLETED,
        endDate: new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      });

      const event = await eventRepository.findOne({ where: { id: createdEventId } });
      expect(event?.status).toBe(EventStatus.COMPLETED);
    });

    it('should submit feedback for the event', async () => {
      const feedbackDto = {
        eventId: createdEventId,
        rsvpId: createdRsvpId,
        attendeeName: 'Alice Johnson',
        attendeeEmail: 'alice.johnson@example.com',
        overallRating: 5,
        contentRating: 5,
        organizationRating: 4,
        venueRating: 4,
        comments: 'Excellent conference! Very well organized and informative presentations.',
        suggestions: 'Maybe provide more networking time during breaks.',
        whatWorkedWell: 'Great speakers, good venue, excellent food',
        whatCouldImprove: 'Could use better WiFi and more power outlets',
        wouldRecommend: true,
        wouldAttendAgain: true,
      };

      const response = await request(app.getHttpServer())
        .post(`/event-rsvp/events/${createdEventId}/feedback`)
        .send(feedbackDto)
        .expect(201);

      expect(response.body).toMatchObject({
        eventId: createdEventId,
        rsvpId: createdRsvpId,
        attendeeName: feedbackDto.attendeeName,
        attendeeEmail: feedbackDto.attendeeEmail,
        overallRating: feedbackDto.overallRating,
        contentRating: feedbackDto.contentRating,
        organizationRating: feedbackDto.organizationRating,
        venueRating: feedbackDto.venueRating,
        comments: feedbackDto.comments,
        wouldRecommend: feedbackDto.wouldRecommend,
        wouldAttendAgain: feedbackDto.wouldAttendAgain,
        status: FeedbackStatus.SUBMITTED,
      });

      expect(response.body.averageRating).toBeCloseTo(4.5, 1);
    });

    it('should get event feedback analytics', async () => {
      const response = await request(app.getHttpServer())
        .get(`/event-rsvp/events/${createdEventId}/feedback/analytics`)
        .expect(200);

      expect(response.body).toMatchObject({
        totalFeedbacks: 1,
        averageOverallRating: 5,
        averageContentRating: 5,
        averageOrganizationRating: 4,
        averageVenueRating: 4,
        recommendationRate: 100,
        attendAgainRate: 100,
        sentiment: 'positive',
      });

      expect(response.body.responseRate).toBeGreaterThan(0);
    });

    it('should get registration form analytics', async () => {
      const response = await request(app.getHttpServer())
        .get(`/event-rsvp/registration-forms/${createdFormId}/analytics`)
        .expect(200);

      expect(response.body).toMatchObject({
        totalResponses: 1,
        submittedResponses: 1,
        approvedResponses: 0,
        rejectedResponses: 0,
      });

      expect(response.body.fieldAnalytics).toHaveLength(6); // 6 form fields
      expect(response.body.fieldAnalytics[0]).toMatchObject({
        fieldId: 'firstName',
        fieldName: 'firstName',
        fieldType: FieldType.TEXT,
        totalResponses: 1,
        skipRate: 0,
      });
    });

    it('should get event statistics', async () => {
      const response = await request(app.getHttpServer())
        .get('/event-rsvp/events/statistics')
        .expect(200);

      expect(response.body).toMatchObject({
        totalEvents: 1,
        publishedEvents: 1,
        totalRsvps: 1,
        confirmedRsvps: 1,
        totalAttendees: 1,
      });

      expect(response.body.averageAttendanceRate).toBeGreaterThan(0);
    });

    it('should get top-rated events', async () => {
      const response = await request(app.getHttpServer())
        .get('/event-rsvp/feedback/top-rated-events?limit=5')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        eventId: createdEventId,
        eventTitle: 'Tech Conference 2024',
        averageRating: expect.any(Number),
        totalFeedbacks: 1,
      });

      expect(response.body[0].averageRating).toBeGreaterThan(4);
    });
  });

  describe('Validation and Error Handling', () => {
    it('should validate registration form responses', async () => {
      const invalidResponse = {
        eventId: createdEventId,
        formId: createdFormId,
        respondentName: 'Bob Smith',
        respondentEmail: 'bob.smith@example.com',
        responses: {
          firstName: '', // Required field is empty
          lastName: 'Smith',
          email: 'invalid-email', // Invalid email format
          experience: 'invalid-option', // Invalid select option
        }
      };

      const response = await request(app.getHttpServer())
        .post(`/event-rsvp/registration-forms/${createdFormId}/responses`)
        .send(invalidResponse)
        .expect(201); // Still creates but as draft with validation errors

      expect(response.body.status).toBe(ResponseStatus.DRAFT);
      expect(response.body.isValid).toBe(false);
      expect(response.body.validationErrors).toHaveLength(2); // firstName required, email format
      expect(response.body.submittedAt).toBeNull();
    });

    it('should prevent duplicate feedback submission', async () => {
      const duplicateFeedback = {
        eventId: createdEventId,
        attendeeName: 'Alice Johnson',
        attendeeEmail: 'alice.johnson@example.com',
        overallRating: 3,
        comments: 'Duplicate feedback attempt',
      };

      await request(app.getHttpServer())
        .post(`/event-rsvp/events/${createdEventId}/feedback`)
        .send(duplicateFeedback)
        .expect(400);
    });

    it('should prevent RSVP for nonexistent event', async () => {
      const invalidRsvp = {
        attendeeName: 'John Doe',
        attendeeEmail: 'john.doe@example.com',
      };

      await request(app.getHttpServer())
        .post('/event-rsvp/events/00000000-0000-0000-0000-000000000000/rsvp')
        .send(invalidRsvp)
        .expect(404);
    });

    it('should handle capacity limits', async () => {
      // Create a small capacity event
      const smallEvent = {
        title: 'Small Workshop',
        description: 'Limited capacity workshop',
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
        location: 'Small Room',
        capacity: 1,
        organizerName: 'Workshop Leader',
        organizerEmail: 'leader@example.com',
      };

      const eventResponse = await request(app.getHttpServer())
        .post('/event-rsvp/events')
        .send(smallEvent)
        .expect(201);

      await request(app.getHttpServer())
        .post(`/event-rsvp/events/${eventResponse.body.id}/publish`)
        .expect(200);

      // First RSVP should succeed
      const firstRsvp = {
        attendeeName: 'First Person',
        attendeeEmail: 'first@example.com',
      };

      await request(app.getHttpServer())
        .post(`/event-rsvp/events/${eventResponse.body.id}/rsvp`)
        .send(firstRsvp)
        .expect(201);

      // Second RSVP should be waitlisted
      const secondRsvp = {
        attendeeName: 'Second Person',
        attendeeEmail: 'second@example.com',
      };

      const waitlistResponse = await request(app.getHttpServer())
        .post(`/event-rsvp/events/${eventResponse.body.id}/rsvp`)
        .send(secondRsvp)
        .expect(201);

      expect(waitlistResponse.body.status).toBe(RsvpStatus.WAITLISTED);
    });
  });

  describe('Bulk Operations', () => {
    it('should handle bulk response updates', async () => {
      // Create some additional registration responses
      const responses = [];
      for (let i = 0; i < 3; i++) {
        const responseDto = {
          eventId: createdEventId,
          formId: createdFormId,
          respondentName: `User ${i}`,
          respondentEmail: `user${i}@example.com`,
          responses: {
            firstName: `User${i}`,
            lastName: 'Test',
            email: `user${i}@example.com`,
            experience: '3-5',
          }
        };

        const response = await request(app.getHttpServer())
          .post(`/event-rsvp/registration-forms/${createdFormId}/responses`)
          .send(responseDto)
          .expect(201);

        responses.push(response.body.id);
      }

      // Bulk approve responses
      const bulkUpdate = {
        responseIds: responses,
        status: ResponseStatus.APPROVED,
        reviewedBy: 'admin@example.com',
        reviewNotes: 'Bulk approval of valid responses',
      };

      const bulkResponse = await request(app.getHttpServer())
        .post('/event-rsvp/registration-responses/bulk-update')
        .send(bulkUpdate)
        .expect(200);

      expect(bulkResponse.body.updated).toBe(3);
      expect(bulkResponse.body.errors).toHaveLength(0);
    });
  });

  describe('Search and Filtering', () => {
    it('should filter events by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/event-rsvp/events?status=published&limit=10')
        .expect(200);

      expect(response.body.events).toHaveLength(1);
      expect(response.body.events[0].status).toBe(EventStatus.PUBLISHED);
    });

    it('should search events by title', async () => {
      const response = await request(app.getHttpServer())
        .get('/event-rsvp/events?search=Tech Conference&limit=10')
        .expect(200);

      expect(response.body.events).toHaveLength(1);
      expect(response.body.events[0].title).toContain('Tech Conference');
    });

    it('should filter RSVPs by status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/event-rsvp/events/${createdEventId}/rsvps/confirmed`)
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].status).toBe(RsvpStatus.ATTENDED); // Our RSVP was checked in
    });
  });
});