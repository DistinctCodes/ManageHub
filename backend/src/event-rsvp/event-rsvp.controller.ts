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
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { CreateRsvpDto } from './dto/create-rsvp.dto';
import { UpdateRsvpDto } from './dto/update-rsvp.dto';
import { EventQueryDto } from './dto/event-query.dto';
import { RsvpQueryDto } from './dto/rsvp-query.dto';
import { CreateEventTemplateDto } from './dto/create-event-template.dto';
import { CreateEventFromTemplateDto, CreateEventSeriesDto } from './dto/create-event-from-template.dto';

@Controller('event-rsvp')
export class EventRsvpController {
  constructor(
    private readonly eventService: EventService,
    private readonly rsvpService: RsvpService,
    private readonly eventTemplateService: EventTemplateService,
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
  async getEventsByOrganizer(
    @Param('organizerId') organizerId: string,
  ) {
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
    return rsvps.filter(rsvp => rsvp.isConfirmed);
  }

  @Get('events/:eventId/rsvps/waitlist')
  async getEventWaitlist(@Param('eventId', ParseUUIDPipe) eventId: string) {
    return await this.rsvpService.getWaitlist(eventId);
  }

  @Get('events/:eventId/rsvps/attendees')
  async getEventAttendees(@Param('eventId', ParseUUIDPipe) eventId: string) {
    const rsvps = await this.rsvpService.getEventRsvps(eventId);
    return rsvps.filter(rsvp => rsvp.hasAttended);
  }

  @Get('events/:eventId/rsvps/summary')
  async getEventRsvpSummary(@Param('eventId', ParseUUIDPipe) eventId: string) {
    const rsvps = await this.rsvpService.getEventRsvps(eventId);
    
    return {
      total: rsvps.length,
      confirmed: rsvps.filter(r => r.isConfirmed).length,
      waitlisted: rsvps.filter(r => r.isWaitlisted).length,
      cancelled: rsvps.filter(r => r.isCancelled).length,
      attended: rsvps.filter(r => r.hasAttended).length,
      noShow: rsvps.filter(r => r.status === 'no_show').length,
      vipCount: rsvps.filter(r => r.isVip).length,
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
    
    return rsvps.filter(rsvp => 
      rsvp.event && 
      rsvp.event.startDate > now && 
      (rsvp.isConfirmed || rsvp.isWaitlisted)
    );
  }

  @Get('users/:userId/rsvps/history')
  async getUserRsvpHistory(@Param('userId') userId: string) {
    const rsvps = await this.rsvpService.getUserRsvps(userId);
    const now = new Date();
    
    return rsvps.filter(rsvp => 
      rsvp.event && 
      rsvp.event.endDate < now
    );
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
        const rsvp = await this.rsvpService.cancelRsvp(rsvpId, cancelData.reason);
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
        '(event.confirmedRsvps / event.capacity * 100) as utilizationPercentage'
      ]);

    if (startDate) {
      queryBuilder.andWhere('event.startDate >= :startDate', { 
        startDate: new Date(startDate) 
      });
    }

    if (endDate) {
      queryBuilder.andWhere('event.startDate <= :endDate', { 
        endDate: new Date(endDate) 
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
        'event.startDate'
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
        'COUNT(CASE WHEN rsvp.status = "waitlisted" THEN 1 END) as waitlistedCount'
      ])
      .where('rsvp.createdAt >= :startDate', { startDate })
      .groupBy('DATE(rsvp.createdAt)')
      .orderBy('date', 'ASC')
      .getRawMany();
  }
}