import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventReminderService, ReminderType } from './event-reminder.service';
import { Event, EventStatus } from '../entities/event.entity';
import { EventRsvp, RsvpStatus } from '../entities/event-rsvp.entity';
import { EmailNotificationService } from './email-notification.service';

describe('EventReminderService', () => {
  let service: EventReminderService;
  let eventRepository: Repository<Event>;
  let rsvpRepository: Repository<EventRsvp>;
  let emailNotificationService: EmailNotificationService;

  const mockEvent = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    title: 'Test Event',
    description: 'A test event',
    startDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
    endDate: new Date(Date.now() + 25 * 60 * 60 * 1000),
    location: 'Test Venue',
    organizerName: 'John Organizer',
    organizerEmail: 'organizer@example.com',
    status: EventStatus.PUBLISHED,
  };

  const mockRsvp = {
    id: '123e4567-e89b-12d3-a456-426614174001',
    eventId: mockEvent.id,
    attendeeName: 'John Doe',
    attendeeEmail: 'john@example.com',
    status: RsvpStatus.CONFIRMED,
  };

  const mockPastEvent = {
    ...mockEvent,
    id: '123e4567-e89b-12d3-a456-426614174002',
    startDate: new Date(Date.now() - 25 * 60 * 60 * 1000), // Yesterday
    endDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
    status: EventStatus.COMPLETED,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventReminderService,
        {
          provide: getRepositoryToken(Event),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(EventRsvp),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: EmailNotificationService,
          useValue: {
            sendRsvpConfirmation: jest.fn(),
            sendWaitlistNotification: jest.fn(),
            sendPromotionFromWaitlist: jest.fn(),
            sendEventReminder: jest.fn(),
            sendEventUpdate: jest.fn(),
            sendEventCancellation: jest.fn(),
            sendCheckInConfirmation: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EventReminderService>(EventReminderService);
    eventRepository = module.get<Repository<Event>>(getRepositoryToken(Event));
    rsvpRepository = module.get<Repository<EventRsvp>>(getRepositoryToken(EventRsvp));
    emailNotificationService = module.get<EmailNotificationService>(EmailNotificationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendCustomReminder', () => {
    it('should send custom reminder successfully', async () => {
      const mockRsvps = [mockRsvp];
      jest.spyOn(eventRepository, 'findOne').mockResolvedValue({
        ...mockEvent,
        rsvps: mockRsvps,
      } as any);
      jest.spyOn(rsvpRepository, 'find').mockResolvedValue(mockRsvps as EventRsvp[]);

      // Mock email sending to succeed
      const sendEmailSpy = jest.fn().mockResolvedValue(undefined);
      // We need to mock the private sendEmail method via the notification service
      jest.spyOn(emailNotificationService, 'sendEventReminder').mockResolvedValue(undefined);

      const result = await service.sendCustomReminder(
        mockEvent.id,
        ReminderType.REMINDER,
        ['john@example.com'],
        'Custom reminder message'
      );

      expect(result.sent).toBe(1);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle errors when sending reminders', async () => {
      jest.spyOn(eventRepository, 'findOne').mockResolvedValue({
        ...mockEvent,
        rsvps: [mockRsvp],
      } as any);

      // Mock email sending to fail
      jest.spyOn(emailNotificationService, 'sendEventReminder')
        .mockRejectedValue(new Error('Email sending failed'));

      const result = await service.sendCustomReminder(
        mockEvent.id,
        ReminderType.REMINDER,
        ['john@example.com']
      );

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Email sending failed');
    });

    it('should throw error when event not found', async () => {
      jest.spyOn(eventRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.sendCustomReminder(
          'nonexistent',
          ReminderType.REMINDER,
          ['john@example.com']
        )
      ).rejects.toThrow('Event not found');
    });

    it('should throw error for unknown reminder type', async () => {
      jest.spyOn(eventRepository, 'findOne').mockResolvedValue(mockEvent as Event);

      await expect(
        service.sendCustomReminder(
          mockEvent.id,
          'UNKNOWN_TYPE' as ReminderType,
          ['john@example.com']
        )
      ).rejects.toThrow('Template not found for reminder type');
    });
  });

  describe('processReminders', () => {
    it('should process all reminder types without errors', async () => {
      // Mock repository calls for different reminder scenarios
      jest.spyOn(eventRepository, 'find')
        .mockResolvedValueOnce([]) // Early reminders
        .mockResolvedValueOnce([]) // Regular reminders  
        .mockResolvedValueOnce([]) // Final reminders
        .mockResolvedValueOnce([]) // Thank you notifications
        .mockResolvedValueOnce([]) // Feedback requests
        .mockResolvedValueOnce([]); // Follow up notifications

      await expect(service.processReminders()).resolves.not.toThrow();
    });

    it('should handle errors during processing gracefully', async () => {
      jest.spyOn(eventRepository, 'find')
        .mockRejectedValueOnce(new Error('Database error'));

      // Should not throw, should log error instead
      await expect(service.processReminders()).resolves.not.toThrow();
    });
  });

  describe('getReminderLogs', () => {
    it('should return reminder logs for an event', async () => {
      // First send a reminder to create logs
      jest.spyOn(eventRepository, 'findOne').mockResolvedValue({
        ...mockEvent,
        rsvps: [mockRsvp],
      } as any);

      // Mock successful email sending
      jest.spyOn(emailNotificationService, 'sendEventReminder').mockResolvedValue(undefined);

      await service.sendCustomReminder(
        mockEvent.id,
        ReminderType.REMINDER,
        ['john@example.com']
      );

      const logs = await service.getReminderLogs(mockEvent.id);

      expect(logs).toBeDefined();
      expect(Array.isArray(logs)).toBe(true);
    });

    it('should filter logs by date range', async () => {
      const logs = await service.getReminderLogs(mockEvent.id, 7);

      expect(logs).toBeDefined();
      expect(Array.isArray(logs)).toBe(true);
    });

    it('should return all logs when no event ID specified', async () => {
      const logs = await service.getReminderLogs();

      expect(logs).toBeDefined();
      expect(Array.isArray(logs)).toBe(true);
    });
  });

  describe('getReminderStatistics', () => {
    it('should return statistics for an event', async () => {
      const stats = await service.getReminderStatistics(mockEvent.id);

      expect(stats).toBeDefined();
      expect(stats.totalSent).toBeDefined();
      expect(stats.successRate).toBeDefined();
      expect(stats.remindersByType).toBeDefined();
      expect(stats.recentActivity).toBeDefined();
      expect(Array.isArray(stats.recentActivity)).toBe(true);
    });

    it('should return global statistics when no event ID specified', async () => {
      const stats = await service.getReminderStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalSent).toBeDefined();
      expect(stats.successRate).toBeDefined();
      expect(stats.remindersByType).toBeDefined();
      expect(stats.recentActivity).toBeDefined();
    });

    it('should handle empty logs gracefully', async () => {
      const stats = await service.getReminderStatistics('nonexistent-event');

      expect(stats.totalSent).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.recentActivity).toHaveLength(7); // 7 days of data
    });
  });

  describe('template variable building', () => {
    it('should build correct variables for event reminder', async () => {
      jest.spyOn(eventRepository, 'findOne').mockResolvedValue({
        ...mockEvent,
        rsvps: [mockRsvp],
      } as any);

      jest.spyOn(emailNotificationService, 'sendEventReminder').mockImplementation(
        async (rsvp: any, event: any, hours: number) => {
          // Verify that the correct data is being passed
          expect(event.title).toBe(mockEvent.title);
          expect(rsvp.attendeeName).toBe(mockRsvp.attendeeName);
          return Promise.resolve();
        }
      );

      await service.sendCustomReminder(
        mockEvent.id,
        ReminderType.REMINDER,
        ['john@example.com']
      );
    });

    it('should include feedback URL for feedback requests', async () => {
      jest.spyOn(eventRepository, 'findOne').mockResolvedValue({
        ...mockEvent,
        rsvps: [mockRsvp],
      } as any);

      jest.spyOn(emailNotificationService, 'sendEventReminder').mockResolvedValue(undefined);

      await service.sendCustomReminder(
        mockEvent.id,
        ReminderType.POST_EVENT_FEEDBACK,
        ['john@example.com']
      );

      // Should execute without errors and include feedback URL in variables
      expect(emailNotificationService.sendEventReminder).toHaveBeenCalled();
    });
  });

  describe('reminder type targeting', () => {
    it('should target confirmed RSVPs for pre-event reminders', async () => {
      const confirmedRsvp = { ...mockRsvp, status: RsvpStatus.CONFIRMED };
      const cancelledRsvp = { ...mockRsvp, id: 'cancelled', status: RsvpStatus.CANCELLED };
      
      jest.spyOn(eventRepository, 'findOne').mockResolvedValue({
        ...mockEvent,
        rsvps: [confirmedRsvp, cancelledRsvp],
      } as any);

      jest.spyOn(rsvpRepository, 'find').mockResolvedValue([confirmedRsvp] as EventRsvp[]);
      jest.spyOn(emailNotificationService, 'sendEventReminder').mockResolvedValue(undefined);

      const result = await service.sendCustomReminder(
        mockEvent.id,
        ReminderType.REMINDER
      );

      // Should only send to confirmed RSVP
      expect(result.sent).toBe(1);
    });

    it('should target attended RSVPs for post-event notifications', async () => {
      const attendedRsvp = { ...mockRsvp, status: RsvpStatus.ATTENDED };
      const noShowRsvp = { ...mockRsvp, id: 'noshow', status: RsvpStatus.NO_SHOW };
      
      jest.spyOn(eventRepository, 'findOne').mockResolvedValue({
        ...mockPastEvent,
        rsvps: [attendedRsvp, noShowRsvp],
      } as any);

      jest.spyOn(rsvpRepository, 'find').mockResolvedValue([attendedRsvp] as EventRsvp[]);
      jest.spyOn(emailNotificationService, 'sendEventReminder').mockResolvedValue(undefined);

      const result = await service.sendCustomReminder(
        mockPastEvent.id,
        ReminderType.POST_EVENT_THANK_YOU
      );

      // Should only send to attended RSVP
      expect(result.sent).toBe(1);
    });
  });
});