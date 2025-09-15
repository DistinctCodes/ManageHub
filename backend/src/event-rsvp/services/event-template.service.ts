import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventTemplate, RecurrenceType, TemplateStatus } from '../entities/event-template.entity';
import { EventSeries, SeriesStatus } from '../entities/event-series.entity';
import { Event, EventStatus } from '../entities/event.entity';
import { CreateEventTemplateDto } from '../dto/create-event-template.dto';
import { CreateEventFromTemplateDto, CreateEventSeriesDto } from '../dto/create-event-from-template.dto';
import { CreateEventDto } from '../dto/create-event.dto';
import { EventService } from './event.service';

@Injectable()
export class EventTemplateService {
  private readonly logger = new Logger(EventTemplateService.name);

  constructor(
    @InjectRepository(EventTemplate)
    private templateRepository: Repository<EventTemplate>,
    @InjectRepository(EventSeries)
    private seriesRepository: Repository<EventSeries>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    private eventService: EventService,
  ) {}

  async createTemplate(createTemplateDto: CreateEventTemplateDto): Promise<EventTemplate> {
    try {
      const template = this.templateRepository.create({
        ...createTemplateDto,
        recurrenceEndDate: createTemplateDto.recurrenceEndDate
          ? new Date(createTemplateDto.recurrenceEndDate)
          : null,
      });

      const savedTemplate = await this.templateRepository.save(template);
      this.logger.log(`Event template created successfully: ${savedTemplate.id}`);
      return savedTemplate;
    } catch (error) {
      this.logger.error(`Failed to create event template: ${error.message}`);
      throw error;
    }
  }

  async findAllTemplates(createdBy?: string): Promise<EventTemplate[]> {
    try {
      const where = createdBy ? { createdBy, status: TemplateStatus.ACTIVE } : { status: TemplateStatus.ACTIVE };
      return await this.templateRepository.find({
        where,
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Failed to fetch templates: ${error.message}`);
      throw error;
    }
  }

  async findTemplate(id: string): Promise<EventTemplate> {
    try {
      const template = await this.templateRepository.findOne({
        where: { id },
      });

      if (!template) {
        throw new NotFoundException(`Template with ID ${id} not found`);
      }

      return template;
    } catch (error) {
      this.logger.error(`Failed to fetch template ${id}: ${error.message}`);
      throw error;
    }
  }

  async updateTemplate(id: string, updateData: Partial<CreateEventTemplateDto>): Promise<EventTemplate> {
    try {
      const template = await this.findTemplate(id);

      Object.assign(template, {
        ...updateData,
        recurrenceEndDate: updateData.recurrenceEndDate
          ? new Date(updateData.recurrenceEndDate)
          : template.recurrenceEndDate,
      });

      const savedTemplate = await this.templateRepository.save(template);
      this.logger.log(`Event template updated successfully: ${savedTemplate.id}`);
      return savedTemplate;
    } catch (error) {
      this.logger.error(`Failed to update template ${id}: ${error.message}`);
      throw error;
    }
  }

  async deleteTemplate(id: string): Promise<void> {
    try {
      const template = await this.findTemplate(id);
      
      // Check if template has active series
      const activeSeries = await this.seriesRepository.count({
        where: { templateId: id, status: SeriesStatus.ACTIVE },
      });

      if (activeSeries > 0) {
        throw new BadRequestException('Cannot delete template with active event series');
      }

      template.status = TemplateStatus.ARCHIVED;
      await this.templateRepository.save(template);
      
      this.logger.log(`Event template archived: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete template ${id}: ${error.message}`);
      throw error;
    }
  }

  async createEventFromTemplate(createFromTemplateDto: CreateEventFromTemplateDto): Promise<Event> {
    try {
      const template = await this.findTemplate(createFromTemplateDto.templateId);

      // Update template usage statistics
      template.usageCount += 1;
      template.lastUsedAt = new Date();
      await this.templateRepository.save(template);

      // Create event DTO from template
      const eventDto = this.buildEventDtoFromTemplate(template, createFromTemplateDto);

      // Create the event
      const event = await this.eventService.create(eventDto);

      this.logger.log(`Event created from template ${template.id}: ${event.id}`);
      return event;
    } catch (error) {
      this.logger.error(`Failed to create event from template: ${error.message}`);
      throw error;
    }
  }

  async createEventSeries(createSeriesDto: CreateEventSeriesDto): Promise<EventSeries> {
    try {
      const template = await this.findTemplate(createSeriesDto.templateId);

      if (template.recurrenceType === RecurrenceType.NONE) {
        throw new BadRequestException('Template must have recurrence configured to create a series');
      }

      // Calculate first event date
      const firstEventDate = new Date(createSeriesDto.startDate);
      const nextEventDate = this.calculateNextEventDate(firstEventDate, template);

      const series = this.seriesRepository.create({
        ...createSeriesDto,
        startDate: firstEventDate,
        endDate: createSeriesDto.endDate ? new Date(createSeriesDto.endDate) : template.recurrenceEndDate,
        nextEventDate,
        eventsCreated: 0,
      });

      const savedSeries = await this.seriesRepository.save(series);

      // Create the first event
      await this.createEventForSeries(savedSeries, firstEventDate);

      this.logger.log(`Event series created successfully: ${savedSeries.id}`);
      return savedSeries;
    } catch (error) {
      this.logger.error(`Failed to create event series: ${error.message}`);
      throw error;
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async processRecurringEvents(): Promise<void> {
    this.logger.log('Processing recurring events...');

    try {
      const activeSeries = await this.seriesRepository.find({
        where: { status: SeriesStatus.ACTIVE },
        relations: ['template'],
      });

      for (const series of activeSeries) {
        if (series.shouldCreateNextEvent) {
          await this.createEventForSeries(series, series.nextEventDate!);
        }
      }

      this.logger.log(`Processed ${activeSeries.length} active event series`);
    } catch (error) {
      this.logger.error(`Error processing recurring events: ${error.message}`);
    }
  }

  async pauseSeries(seriesId: string): Promise<EventSeries> {
    try {
      const series = await this.findSeries(seriesId);
      series.status = SeriesStatus.PAUSED;
      
      const savedSeries = await this.seriesRepository.save(series);
      this.logger.log(`Event series paused: ${seriesId}`);
      return savedSeries;
    } catch (error) {
      this.logger.error(`Failed to pause series ${seriesId}: ${error.message}`);
      throw error;
    }
  }

  async resumeSeries(seriesId: string): Promise<EventSeries> {
    try {
      const series = await this.findSeries(seriesId);
      
      if (series.hasReachedLimit) {
        throw new BadRequestException('Cannot resume series that has reached its limit');
      }

      series.status = SeriesStatus.ACTIVE;
      
      const savedSeries = await this.seriesRepository.save(series);
      this.logger.log(`Event series resumed: ${seriesId}`);
      return savedSeries;
    } catch (error) {
      this.logger.error(`Failed to resume series ${seriesId}: ${error.message}`);
      throw error;
    }
  }

  async cancelSeries(seriesId: string): Promise<EventSeries> {
    try {
      const series = await this.findSeries(seriesId);
      series.status = SeriesStatus.CANCELLED;
      
      const savedSeries = await this.seriesRepository.save(series);
      this.logger.log(`Event series cancelled: ${seriesId}`);
      return savedSeries;
    } catch (error) {
      this.logger.error(`Failed to cancel series ${seriesId}: ${error.message}`);
      throw error;
    }
  }

  async findSeries(id: string): Promise<EventSeries> {
    try {
      const series = await this.seriesRepository.findOne({
        where: { id },
        relations: ['template'],
      });

      if (!series) {
        throw new NotFoundException(`Event series with ID ${id} not found`);
      }

      return series;
    } catch (error) {
      this.logger.error(`Failed to fetch series ${id}: ${error.message}`);
      throw error;
    }
  }

  async getSeriesList(createdBy?: string): Promise<EventSeries[]> {
    try {
      const where = createdBy ? { createdBy } : {};
      return await this.seriesRepository.find({
        where,
        relations: ['template'],
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Failed to fetch series list: ${error.message}`);
      throw error;
    }
  }

  private async createEventForSeries(series: EventSeries, eventDate: Date): Promise<Event> {
    try {
      const template = series.template;
      
      // Calculate end date
      const endDate = new Date(eventDate);
      endDate.setMinutes(endDate.getMinutes() + template.defaultDuration);

      const createFromTemplateDto: CreateEventFromTemplateDto = {
        templateId: template.id,
        startDate: eventDate.toISOString(),
        endDate: endDate.toISOString(),
        overrides: series.overrides,
        createdBy: series.createdBy,
      };

      const event = await this.createEventFromTemplate(createFromTemplateDto);

      // Update series
      series.eventsCreated += 1;
      series.lastEventCreated = new Date();
      series.nextEventDate = this.calculateNextEventDate(eventDate, template);

      // Check if series should be completed
      if (series.hasReachedLimit) {
        series.status = SeriesStatus.COMPLETED;
        series.nextEventDate = null;
      }

      await this.seriesRepository.save(series);

      this.logger.log(`Event created for series ${series.id}: ${event.id}`);
      return event;
    } catch (error) {
      this.logger.error(`Failed to create event for series ${series.id}: ${error.message}`);
      throw error;
    }
  }

  private buildEventDtoFromTemplate(
    template: EventTemplate,
    createDto: CreateEventFromTemplateDto,
  ): CreateEventDto {
    const startDate = new Date(createDto.startDate);
    const endDate = createDto.endDate 
      ? new Date(createDto.endDate)
      : new Date(startDate.getTime() + template.defaultDuration * 60 * 1000);

    // Calculate registration deadline
    const registrationDeadline = new Date(startDate);
    registrationDeadline.setHours(
      registrationDeadline.getHours() - template.registrationDeadlineHours,
    );

    // Apply overrides
    const overrides = createDto.overrides || {};

    return {
      title: overrides.title || template.title,
      description: overrides.description || template.description,
      eventType: overrides.eventType || template.eventType,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      location: overrides.location || template.location,
      capacity: overrides.capacity || template.defaultCapacity,
      organizerId: overrides.organizerId || template.defaultOrganizerId,
      organizerName: overrides.organizerName || template.defaultOrganizerName,
      organizerEmail: overrides.organizerEmail || template.defaultOrganizerEmail,
      requirements: overrides.requirements || template.requirements,
      agenda: overrides.agenda || template.agenda,
      price: overrides.price !== undefined ? overrides.price : template.defaultPrice,
      isPublic: overrides.isPublic !== undefined ? overrides.isPublic : template.isPublic,
      allowWaitlist: overrides.allowWaitlist !== undefined ? overrides.allowWaitlist : template.allowWaitlist,
      registrationDeadline: registrationDeadline.toISOString(),
      cancellationPolicy: overrides.cancellationPolicy || template.cancellationPolicy,
      additionalInfo: createDto.customMessage || overrides.additionalInfo || template.additionalInfo,
      imageUrl: overrides.imageUrl || template.imageUrl,
      tags: overrides.tags || template.tags,
      customFields: overrides.customFields || template.customFields,
    };
  }

  private calculateNextEventDate(currentDate: Date, template: EventTemplate): Date | null {
    if (template.recurrenceType === RecurrenceType.NONE) {
      return null;
    }

    const nextDate = new Date(currentDate);
    const interval = template.recurrenceInterval || 1;

    switch (template.recurrenceType) {
      case RecurrenceType.DAILY:
        nextDate.setDate(nextDate.getDate() + interval);
        break;

      case RecurrenceType.WEEKLY:
        nextDate.setDate(nextDate.getDate() + (7 * interval));
        break;

      case RecurrenceType.MONTHLY:
        nextDate.setMonth(nextDate.getMonth() + interval);
        break;

      case RecurrenceType.YEARLY:
        nextDate.setFullYear(nextDate.getFullYear() + interval);
        break;

      case RecurrenceType.CUSTOM:
        // Handle custom recurrence based on recurrenceConfig
        return this.calculateCustomRecurrence(currentDate, template);

      default:
        return null;
    }

    // Check if we've exceeded the end date or max occurrences
    if (template.recurrenceEndDate && nextDate > template.recurrenceEndDate) {
      return null;
    }

    return nextDate;
  }

  private calculateCustomRecurrence(currentDate: Date, template: EventTemplate): Date | null {
    // Implement custom recurrence logic based on template.recurrenceConfig
    // This could include complex patterns like "every 2nd Tuesday of the month"
    const config = template.recurrenceConfig || {};
    
    // Example implementation for "every 2nd Tuesday"
    if (config.pattern === 'weekday_of_month') {
      const nextDate = new Date(currentDate);
      nextDate.setMonth(nextDate.getMonth() + 1);
      
      // Find the nth occurrence of the specified weekday
      const targetWeekday = config.weekday || 2; // Tuesday
      const occurrence = config.occurrence || 2; // 2nd occurrence
      
      return this.findNthWeekdayOfMonth(nextDate, targetWeekday, occurrence);
    }

    // Default to monthly if no specific pattern
    const nextDate = new Date(currentDate);
    nextDate.setMonth(nextDate.getMonth() + 1);
    return nextDate;
  }

  private findNthWeekdayOfMonth(date: Date, weekday: number, occurrence: number): Date {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    
    // Find first occurrence of the weekday
    const firstWeekday = new Date(firstDay);
    const daysToAdd = (weekday - firstDay.getDay() + 7) % 7;
    firstWeekday.setDate(1 + daysToAdd);
    
    // Add weeks to get the nth occurrence
    firstWeekday.setDate(firstWeekday.getDate() + (occurrence - 1) * 7);
    
    return firstWeekday;
  }
}