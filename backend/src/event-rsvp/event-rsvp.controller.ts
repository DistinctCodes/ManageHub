import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
} from '@nestjs/common';
import { EventService } from './services/event.service';
import { RsvpService } from './services/rsvp.service';
import { EventTemplateService } from './services/event-template.service';
import { EventFeedbackService } from './services/event-feedback.service';
import { EventRegistrationService } from './services/event-registration.service';
import {
  EventReminderService,
  ReminderType,
} from './services/event-reminder.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CreateRsvpDto } from './dto/create-rsvp.dto';
import { UpdateRsvpDto } from './dto/update-rsvp.dto';
import { EventQueryDto } from './dto/event-query.dto';
import { RsvpQueryDto } from './dto/rsvp-query.dto';
import { CreateEventTemplateDto } from './dto/create-event-template.dto';
import {
  CreateEventFromTemplateDto,
  CreateEventSeriesDto,
} from './dto/create-event-from-template.dto';
import { CreateEventFeedbackDto } from './dto/create-event-feedback.dto';
import { FeedbackStatus } from './entities/event-feedback.entity';
import {
  CreateRegistrationFormDto,
  UpdateRegistrationFormDto,
  FormQueryDto,
} from './dto/create-registration-form.dto';
import {
  CreateRegistrationResponseDto,
  UpdateRegistrationResponseDto,
  ResponseQueryDto,
  BulkUpdateResponseDto,
} from './dto/create-registration-response.dto';

@Controller('event-rsvp')
export class EventRsvpController {
  constructor(
    private readonly eventService: EventService,
    private readonly rsvpService: RsvpService,
    private readonly eventTemplateService: EventTemplateService,
    private readonly eventFeedbackService: EventFeedbackService,
    private readonly eventRegistrationService: EventRegistrationService,
    private readonly eventReminderService: EventReminderService,
  ) {}

  // Event Management Endpoints

  @Post('events')
  @HttpCode(HttpStatus.CREATED)
  async createEvent(@Body(ValidationPipe) createEventDto: CreateEventDto) {
    return await this.eventService.create(createEventDto);
  }

  @Get('events')
  async findAllEvents(@Query(ValidationPipe) queryDto: EventQueryDto) {
    return await this.eventService.findAll(queryDto);
  }

  @Get('events/statistics')
  async getEventStatistics() {
    return await this.eventService.getEventStatistics();
  }

  @Get('events/upcoming')
  async getUpcomingEvents(@Query('limit') limit?: string) {
    const eventLimit = limit ? parseInt(limit, 10) : 10;
    return await this.eventService.getUpcomingEvents(eventLimit);
  }

  @Get('events/organizer/:organizerId')
  async getEventsByOrganizer(@Param('organizerId') organizerId: string) {
    return await this.eventService.getEventsByOrganizer(organizerId);
  }

  @Get('events/:id')
  async findOneEvent(@Param('id', ParseUUIDPipe) id: string) {
    return await this.eventService.findOne(id);
  }

  @Patch('events/:id')
  async updateEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateEventDto: UpdateEventDto,
  ) {
    return await this.eventService.update(id, updateEventDto);
  }

  @Delete('events/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeEvent(@Param('id', ParseUUIDPipe) id: string) {
    await this.eventService.remove(id);
  }

  @Post('events/:id/publish')
  @HttpCode(HttpStatus.OK)
  async publishEvent(@Param('id', ParseUUIDPipe) id: string) {
    return await this.eventService.publishEvent(id);
  }

  @Post('events/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() cancelData: { reason?: string },
  ) {
    return await this.eventService.cancelEvent(id, cancelData.reason);
  }

  @Get('events/:id/slots')
  async getEventSlots(@Param('id', ParseUUIDPipe) id: string) {
    const event = await this.eventService.findOne(id);
    return {
      capacity: event.capacity,
      confirmedRsvps: event.confirmedRsvps,
      availableSlots: event.availableSlots,
      waitlistCount: event.waitlistCount,
      isFullyBooked: event.isFullyBooked,
      canAcceptRsvp: event.canAcceptRsvp,
    };
  }

  // RSVP Management Endpoints

  @Post('events/:eventId/rsvp')
  @HttpCode(HttpStatus.CREATED)
  async createRsvp(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body(ValidationPipe) createRsvpDto: CreateRsvpDto,
  ) {
    return await this.rsvpService.createRsvp(eventId, createRsvpDto);
  }

  @Get('rsvps')
  async findAllRsvps(@Query(ValidationPipe) queryDto: RsvpQueryDto) {
    return await this.rsvpService.findAll(queryDto);
  }

  @Get('rsvps/statistics')
  async getRsvpStatistics() {
    return await this.rsvpService.getRsvpStatistics();
  }

  @Get('rsvps/:id')
  async findOneRsvp(@Param('id', ParseUUIDPipe) id: string) {
    return await this.rsvpService.findOne(id);
  }

  @Patch('rsvps/:id')
  async updateRsvp(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateRsvpDto: UpdateRsvpDto,
  ) {
    return await this.rsvpService.update(id, updateRsvpDto);
  }

  @Post('rsvps/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelRsvp(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() cancelData: { reason?: string },
  ) {
    return await this.rsvpService.cancelRsvp(id, cancelData.reason);
  }

  @Post('rsvps/:id/checkin')
  @HttpCode(HttpStatus.OK)
  async checkInAttendee(@Param('id', ParseUUIDPipe) id: string) {
    return await this.rsvpService.checkInAttendee(id);
  }

  @Post('rsvps/:id/no-show')
  @HttpCode(HttpStatus.OK)
  async markAsNoShow(@Param('id', ParseUUIDPipe) id: string) {
    return await this.rsvpService.markAsNoShow(id);
  }

  // Event-specific RSVP endpoints

  @Get('events/:eventId/rsvps')
  async getEventRsvps(@Param('eventId', ParseUUIDPipe) eventId: string) {
    return await this.rsvpService.getEventRsvps(eventId);
  }

  @Get('events/:eventId/rsvps/confirmed')
  async getConfirmedRsvps(@Param('eventId', ParseUUIDPipe) eventId: string) {
    const rsvps = await this.rsvpService.getEventRsvps(eventId);
    return rsvps.filter((rsvp) => rsvp.isConfirmed);
  }

  @Get('events/:eventId/rsvps/waitlist')
  async getEventWaitlist(@Param('eventId', ParseUUIDPipe) eventId: string) {
    return await this.rsvpService.getWaitlist(eventId);
  }

  @Get('events/:eventId/rsvps/attendees')
  async getEventAttendees(@Param('eventId', ParseUUIDPipe) eventId: string) {
    const rsvps = await this.rsvpService.getEventRsvps(eventId);
    return rsvps.filter((rsvp) => rsvp.hasAttended);
  }

  @Get('events/:eventId/rsvps/summary')
  async getEventRsvpSummary(@Param('eventId', ParseUUIDPipe) eventId: string) {
    const rsvps = await this.rsvpService.getEventRsvps(eventId);

    return {
      total: rsvps.length,
      confirmed: rsvps.filter((r) => r.isConfirmed).length,
      waitlisted: rsvps.filter((r) => r.isWaitlisted).length,
      cancelled: rsvps.filter((r) => r.isCancelled).length,
      attended: rsvps.filter((r) => r.hasAttended).length,
      noShow: rsvps.filter((r) => r.status === 'no_show').length,
      vipCount: rsvps.filter((r) => r.isVip).length,
    };
  }

  // User-specific RSVP endpoints

  @Get('users/:userId/rsvps')
  async getUserRsvps(@Param('userId') userId: string) {
    return await this.rsvpService.getUserRsvps(userId);
  }

  @Get('users/:userId/rsvps/upcoming')
  async getUserUpcomingRsvps(@Param('userId') userId: string) {
    const rsvps = await this.rsvpService.getUserRsvps(userId);
    const now = new Date();

    return rsvps.filter(
      (rsvp) =>
        rsvp.event &&
        rsvp.event.startDate > now &&
        (rsvp.isConfirmed || rsvp.isWaitlisted),
    );
  }

  @Get('users/:userId/rsvps/history')
  async getUserRsvpHistory(@Param('userId') userId: string) {
    const rsvps = await this.rsvpService.getUserRsvps(userId);
    const now = new Date();

    return rsvps.filter((rsvp) => rsvp.event && rsvp.event.endDate < now);
  }

  // Bulk operations

  @Post('events/:eventId/rsvps/bulk-checkin')
  @HttpCode(HttpStatus.OK)
  async bulkCheckIn(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() checkInData: { rsvpIds: string[] },
  ) {
    const results = [];
    for (const rsvpId of checkInData.rsvpIds) {
      try {
        const rsvp = await this.rsvpService.checkInAttendee(rsvpId);
        results.push({ rsvpId, success: true, rsvp });
      } catch (error) {
        results.push({ rsvpId, success: false, error: error.message });
      }
    }
    return { results };
  }

  @Post('events/:eventId/rsvps/bulk-cancel')
  @HttpCode(HttpStatus.OK)
  async bulkCancel(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body() cancelData: { rsvpIds: string[]; reason?: string },
  ) {
    const results = [];
    for (const rsvpId of cancelData.rsvpIds) {
      try {
        const rsvp = await this.rsvpService.cancelRsvp(
          rsvpId,
          cancelData.reason,
        );
        results.push({ rsvpId, success: true, rsvp });
      } catch (error) {
        results.push({ rsvpId, success: false, error: error.message });
      }
    }
    return { results };
  }

  // Analytics and reporting endpoints

  @Get('analytics/capacity-utilization')
  async getCapacityUtilization(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const queryBuilder = this.eventService['eventRepository']
      .createQueryBuilder('event')
      .select([
        'event.id',
        'event.title',
        'event.capacity',
        'event.confirmedRsvps',
        'event.startDate',
        '(event.confirmedRsvps / event.capacity * 100) as utilizationPercentage',
      ]);

    if (startDate) {
      queryBuilder.andWhere('event.startDate >= :startDate', {
        startDate: new Date(startDate),
      });
    }

    if (endDate) {
      queryBuilder.andWhere('event.startDate <= :endDate', {
        endDate: new Date(endDate),
      });
    }

    queryBuilder.orderBy('event.startDate', 'DESC');

    return await queryBuilder.getRawMany();
  }

  @Get('analytics/popular-events')
  async getPopularEvents(@Query('limit') limit?: string) {
    const eventLimit = limit ? parseInt(limit, 10) : 10;

    return await this.eventService['eventRepository']
      .createQueryBuilder('event')
      .select([
        'event.id',
        'event.title',
        'event.eventType',
        'event.confirmedRsvps',
        'event.capacity',
        'event.startDate',
      ])
      .orderBy('event.confirmedRsvps', 'DESC')
      .limit(eventLimit)
      .getMany();
  }

  @Get('analytics/rsvp-trends')
  async getRsvpTrends(
    @Query('period') period: 'week' | 'month' | 'year' = 'month',
  ) {
    const periodMap = {
      week: 7,
      month: 30,
      year: 365,
    };

    const daysBack = periodMap[period];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    return await this.rsvpService['rsvpRepository']
      .createQueryBuilder('rsvp')
      .select([
        'DATE(rsvp.createdAt) as date',
        'COUNT(*) as rsvpCount',
        'COUNT(CASE WHEN rsvp.status = "confirmed" THEN 1 END) as confirmedCount',
        'COUNT(CASE WHEN rsvp.status = "waitlisted" THEN 1 END) as waitlistedCount',
      ])
      .where('rsvp.createdAt >= :startDate', { startDate })
      .groupBy('DATE(rsvp.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();
  }

  // Event Templates Endpoints

  @Post('templates')
  @HttpCode(HttpStatus.CREATED)
  async createTemplate(
    @Body(ValidationPipe) createTemplateDto: CreateEventTemplateDto,
  ) {
    return await this.eventTemplateService.createTemplate(createTemplateDto);
  }

  @Get('templates')
  async findAllTemplates(@Query('createdBy') createdBy?: string) {
    return await this.eventTemplateService.findAllTemplates(createdBy);
  }

  @Get('templates/:id')
  async findTemplate(@Param('id', ParseUUIDPipe) id: string) {
    return await this.eventTemplateService.findTemplate(id);
  }

  @Patch('templates/:id')
  async updateTemplate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateData: Partial<CreateEventTemplateDto>,
  ) {
    return await this.eventTemplateService.updateTemplate(id, updateData);
  }

  @Delete('templates/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTemplate(@Param('id', ParseUUIDPipe) id: string) {
    await this.eventTemplateService.deleteTemplate(id);
  }

  @Post('templates/:id/create-event')
  @HttpCode(HttpStatus.CREATED)
  async createEventFromTemplate(
    @Param('id', ParseUUIDPipe) templateId: string,
    @Body(ValidationPipe)
    createFromTemplateDto: Omit<CreateEventFromTemplateDto, 'templateId'>,
  ) {
    return await this.eventTemplateService.createEventFromTemplate({
      ...createFromTemplateDto,
      templateId,
    });
  }

  // Event Series (Recurring Events) Endpoints

  @Post('series')
  @HttpCode(HttpStatus.CREATED)
  async createEventSeries(
    @Body(ValidationPipe) createSeriesDto: CreateEventSeriesDto,
  ) {
    return await this.eventTemplateService.createEventSeries(createSeriesDto);
  }

  @Get('series')
  async getEventSeries(@Query('createdBy') createdBy?: string) {
    return await this.eventTemplateService.getSeriesList(createdBy);
  }

  @Get('series/:id')
  async findEventSeries(@Param('id', ParseUUIDPipe) id: string) {
    return await this.eventTemplateService.findSeries(id);
  }

  @Post('series/:id/pause')
  @HttpCode(HttpStatus.OK)
  async pauseEventSeries(@Param('id', ParseUUIDPipe) id: string) {
    return await this.eventTemplateService.pauseSeries(id);
  }

  @Post('series/:id/resume')
  @HttpCode(HttpStatus.OK)
  async resumeEventSeries(@Param('id', ParseUUIDPipe) id: string) {
    return await this.eventTemplateService.resumeSeries(id);
  }

  @Post('series/:id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelEventSeries(@Param('id', ParseUUIDPipe) id: string) {
    return await this.eventTemplateService.cancelSeries(id);
  }

  @Post('series/process-recurring')
  @HttpCode(HttpStatus.OK)
  async processRecurringEvents() {
    await this.eventTemplateService.processRecurringEvents();
    return { message: 'Recurring events processed successfully' };
  }

  // Event Feedback Endpoints

  @Post('events/:eventId/feedback')
  @HttpCode(HttpStatus.CREATED)
  async submitEventFeedback(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body(ValidationPipe) createFeedbackDto: CreateEventFeedbackDto,
  ) {
    createFeedbackDto.eventId = eventId;
    return await this.eventFeedbackService.createFeedback(createFeedbackDto);
  }

  @Get('events/:eventId/feedback')
  async getEventFeedbacks(@Param('eventId', ParseUUIDPipe) eventId: string) {
    return await this.eventFeedbackService.getFeedbacksByEvent(eventId);
  }

  @Get('events/:eventId/feedback/analytics')
  async getEventFeedbackAnalytics(
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ) {
    return await this.eventFeedbackService.getEventFeedbackAnalytics(eventId);
  }

  @Get('feedback/:id')
  async getFeedbackById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.eventFeedbackService.getFeedbackById(id);
  }

  @Patch('feedback/:id/status')
  async updateFeedbackStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body()
    updateData: {
      status: FeedbackStatus;
      reviewedBy?: string;
      reviewNotes?: string;
    },
  ) {
    return await this.eventFeedbackService.updateFeedbackStatus(
      id,
      updateData.status,
      updateData.reviewedBy,
      updateData.reviewNotes,
    );
  }

  @Delete('feedback/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteFeedback(@Param('id', ParseUUIDPipe) id: string) {
    await this.eventFeedbackService.deleteFeedback(id);
  }

  @Get('feedback/pending')
  async getPendingFeedbacks() {
    return await this.eventFeedbackService.getPendingFeedbacks();
  }

  @Get('feedback/summary')
  async getFeedbackSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
    const end = endDate ? new Date(endDate) : new Date();
    return await this.eventFeedbackService.getFeedbackSummaryByDateRange(
      start,
      end,
    );
  }

  @Get('feedback/top-rated-events')
  async getTopRatedEvents(@Query('limit') limit?: string) {
    const eventLimit = limit ? parseInt(limit, 10) : 10;
    return await this.eventFeedbackService.getTopRatedEvents(eventLimit);
  }

  // Event Registration Forms Endpoints

  @Post('events/:eventId/registration-form')
  @HttpCode(HttpStatus.CREATED)
  async createRegistrationForm(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body(ValidationPipe) createFormDto: CreateRegistrationFormDto,
  ) {
    createFormDto.eventId = eventId;
    return await this.eventRegistrationService.createForm(createFormDto);
  }

  @Get('events/:eventId/registration-forms')
  async getEventRegistrationForms(
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ) {
    return await this.eventRegistrationService.getFormsByEvent(eventId);
  }

  @Get('registration-forms')
  async getRegistrationForms(@Query(ValidationPipe) queryDto: FormQueryDto) {
    return await this.eventRegistrationService.getForms(queryDto);
  }

  @Get('registration-forms/:id')
  async getRegistrationFormById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.eventRegistrationService.getFormById(id);
  }

  @Patch('registration-forms/:id')
  async updateRegistrationForm(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateFormDto: UpdateRegistrationFormDto,
  ) {
    return await this.eventRegistrationService.updateForm(id, updateFormDto);
  }

  @Post('registration-forms/:id/publish')
  @HttpCode(HttpStatus.OK)
  async publishRegistrationForm(@Param('id', ParseUUIDPipe) id: string) {
    return await this.eventRegistrationService.publishForm(id);
  }

  @Post('registration-forms/:id/archive')
  @HttpCode(HttpStatus.OK)
  async archiveRegistrationForm(@Param('id', ParseUUIDPipe) id: string) {
    return await this.eventRegistrationService.archiveForm(id);
  }

  @Delete('registration-forms/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRegistrationForm(@Param('id', ParseUUIDPipe) id: string) {
    await this.eventRegistrationService.deleteForm(id);
  }

  @Get('registration-forms/:id/analytics')
  async getRegistrationFormAnalytics(@Param('id', ParseUUIDPipe) id: string) {
    return await this.eventRegistrationService.getFormAnalytics(id);
  }

  // Registration Response Endpoints

  @Post('registration-forms/:formId/responses')
  @HttpCode(HttpStatus.CREATED)
  async submitRegistrationResponse(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Body(ValidationPipe) createResponseDto: CreateRegistrationResponseDto,
  ) {
    createResponseDto.formId = formId;
    return await this.eventRegistrationService.submitResponse(
      createResponseDto,
    );
  }

  @Get('registration-responses')
  async getRegistrationResponses(
    @Query(ValidationPipe) queryDto: ResponseQueryDto,
  ) {
    return await this.eventRegistrationService.getResponses(queryDto);
  }

  @Get('registration-responses/:id')
  async getRegistrationResponseById(@Param('id', ParseUUIDPipe) id: string) {
    return await this.eventRegistrationService.getResponseById(id);
  }

  @Patch('registration-responses/:id')
  async updateRegistrationResponse(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(ValidationPipe) updateResponseDto: UpdateRegistrationResponseDto,
  ) {
    return await this.eventRegistrationService.updateResponse(
      id,
      updateResponseDto,
    );
  }

  @Post('registration-responses/bulk-update')
  @HttpCode(HttpStatus.OK)
  async bulkUpdateRegistrationResponses(
    @Body(ValidationPipe) bulkUpdateDto: BulkUpdateResponseDto,
  ) {
    return await this.eventRegistrationService.bulkUpdateResponses(
      bulkUpdateDto,
    );
  }

  @Delete('registration-responses/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteRegistrationResponse(@Param('id', ParseUUIDPipe) id: string) {
    await this.eventRegistrationService.deleteResponse(id);
  }

  @Get('events/:eventId/registration-responses')
  async getEventRegistrationResponses(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Query(ValidationPipe) queryDto: ResponseQueryDto,
  ) {
    queryDto.eventId = eventId;
    return await this.eventRegistrationService.getResponses(queryDto);
  }

  @Get('registration-forms/:formId/responses')
  async getFormRegistrationResponses(
    @Param('formId', ParseUUIDPipe) formId: string,
    @Query(ValidationPipe) queryDto: ResponseQueryDto,
  ) {
    queryDto.formId = formId;
    return await this.eventRegistrationService.getResponses(queryDto);
  }

  // Event Reminder Endpoints

  @Post('events/:eventId/reminders/send')
  @HttpCode(HttpStatus.OK)
  async sendCustomReminder(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Body()
    reminderData: {
      type: ReminderType;
      recipientEmails?: string[];
      customMessage?: string;
    },
  ) {
    return await this.eventReminderService.sendCustomReminder(
      eventId,
      reminderData.type,
      reminderData.recipientEmails,
      reminderData.customMessage,
    );
  }

  @Post('reminders/process')
  @HttpCode(HttpStatus.OK)
  async processReminders() {
    await this.eventReminderService.processReminders();
    return { message: 'Reminders processed successfully' };
  }

  @Get('events/:eventId/reminders/logs')
  async getReminderLogs(
    @Param('eventId', ParseUUIDPipe) eventId: string,
    @Query('days') days?: string,
  ) {
    const daysNumber = days ? parseInt(days, 10) : 30;
    return await this.eventReminderService.getReminderLogs(eventId, daysNumber);
  }

  @Get('reminders/logs')
  async getAllReminderLogs(@Query('days') days?: string) {
    const daysNumber = days ? parseInt(days, 10) : 30;
    return await this.eventReminderService.getReminderLogs(
      undefined,
      daysNumber,
    );
  }

  @Get('events/:eventId/reminders/statistics')
  async getEventReminderStatistics(
    @Param('eventId', ParseUUIDPipe) eventId: string,
  ) {
    return await this.eventReminderService.getReminderStatistics(eventId);
  }

  @Get('reminders/statistics')
  async getReminderStatistics() {
    return await this.eventReminderService.getReminderStatistics();
  }
}
