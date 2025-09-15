import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like, Between, In } from 'typeorm';
import { Event, EventStatus, EventType } from '../entities/event.entity';
import { CreateEventDto } from '../dto/create-event.dto';
import { UpdateEventDto } from '../dto/update-event.dto';
import { EventQueryDto } from '../dto/event-query.dto';

export interface EventStatistics {
  totalEvents: number;
  upcomingEvents: number;
  pastEvents: number;
  draftEvents: number;
  publishedEvents: number;
  cancelledEvents: number;
  totalCapacity: number;
  totalRsvps: number;
  averageCapacityUtilization: number;
  eventsByType: Record<EventType, number>;
  eventsByMonth: Array<{ month: string; count: number }>;
}

export interface PaginatedEvents {
  data: Event[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

@Injectable()
export class EventService {
  private readonly logger = new Logger(EventService.name);

  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
  ) {}

  async create(createEventDto: CreateEventDto): Promise<Event> {
    try {
      // Validate dates
      const startDate = new Date(createEventDto.startDate);
      const endDate = new Date(createEventDto.endDate);
      const now = new Date();

      if (startDate <= now) {
        throw new BadRequestException('Event start date must be in the future');
      }

      if (endDate <= startDate) {
        throw new BadRequestException('Event end date must be after start date');
      }

      if (createEventDto.registrationDeadline) {
        const regDeadline = new Date(createEventDto.registrationDeadline);
        if (regDeadline >= startDate) {
          throw new BadRequestException(
            'Registration deadline must be before event start date',
          );
        }
      }

      // Create event entity
      const event = this.eventRepository.create({
        ...createEventDto,
        startDate,
        endDate,
        registrationDeadline: createEventDto.registrationDeadline
          ? new Date(createEventDto.registrationDeadline)
          : null,
      });

      const savedEvent = await this.eventRepository.save(event);

      this.logger.log(`Event created successfully: ${savedEvent.id}`);
      return savedEvent;
    } catch (error) {
      this.logger.error(`Failed to create event: ${error.message}`);
      throw error;
    }
  }

  async findAll(queryDto: EventQueryDto): Promise<PaginatedEvents> {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        eventType,
        search,
        organizerId,
        startDate,
        endDate,
        isPublic,
        hasAvailableSlots,
        location,
        sortBy = 'startDate',
        sortOrder = 'ASC',
        tags,
      } = queryDto;

      const queryBuilder = this.eventRepository
        .createQueryBuilder('event')
        .leftJoinAndSelect('event.rsvps', 'rsvp');

      // Apply filters
      if (status) {
        queryBuilder.andWhere('event.status = :status', { status });
      }

      if (eventType) {
        queryBuilder.andWhere('event.eventType = :eventType', { eventType });
      }

      if (search) {
        queryBuilder.andWhere(
          '(event.title LIKE :search OR event.description LIKE :search)',
          { search: `%${search}%` },
        );
      }

      if (organizerId) {
        queryBuilder.andWhere('event.organizerId = :organizerId', {
          organizerId,
        });
      }

      if (startDate) {
        queryBuilder.andWhere('event.startDate >= :startDate', {
          startDate: new Date(startDate),
        });
      }

      if (endDate) {
        queryBuilder.andWhere('event.endDate <= :endDate', {
          endDate: new Date(endDate),
        });
      }

      if (typeof isPublic === 'boolean') {
        queryBuilder.andWhere('event.isPublic = :isPublic', { isPublic });
      }

      if (hasAvailableSlots) {
        queryBuilder.andWhere('event.confirmedRsvps < event.capacity');
      }

      if (location) {
        queryBuilder.andWhere('event.location LIKE :location', {
          location: `%${location}%`,
        });
      }

      if (tags) {
        const tagArray = tags.split(',').map((tag) => tag.trim());
        queryBuilder.andWhere('JSON_CONTAINS(event.tags, :tags)', {
          tags: JSON.stringify(tagArray),
        });
      }

      // Apply sorting
      const validSortFields = [
        'startDate',
        'endDate',
        'createdAt',
        'updatedAt',
        'title',
        'capacity',
        'confirmedRsvps',
      ];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'startDate';
      queryBuilder.orderBy(`event.${sortField}`, sortOrder);

      // Apply pagination
      const skip = (page - 1) * limit;
      queryBuilder.skip(skip).take(limit);

      const [events, total] = await queryBuilder.getManyAndCount();

      return {
        data: events,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to fetch events: ${error.message}`);
      throw error;
    }
  }

  async findOne(id: string): Promise<Event> {
    try {
      const event = await this.eventRepository.findOne({
        where: { id },
        relations: ['rsvps'],
      });

      if (!event) {
        throw new NotFoundException(`Event with ID ${id} not found`);
      }

      return event;
    } catch (error) {
      this.logger.error(`Failed to fetch event ${id}: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, updateEventDto: UpdateEventDto): Promise<Event> {
    try {
      const event = await this.findOne(id);

      // Validate dates if provided
      if (updateEventDto.startDate || updateEventDto.endDate) {
        const startDate = updateEventDto.startDate
          ? new Date(updateEventDto.startDate)
          : event.startDate;
        const endDate = updateEventDto.endDate
          ? new Date(updateEventDto.endDate)
          : event.endDate;

        if (endDate <= startDate) {
          throw new BadRequestException('Event end date must be after start date');
        }
      }

      // Validate capacity changes
      if (updateEventDto.capacity && updateEventDto.capacity < event.confirmedRsvps) {
        throw new BadRequestException(
          `Cannot reduce capacity below current confirmed RSVPs (${event.confirmedRsvps})`,
        );
      }

      // Update the event
      const updatedData = {
        ...updateEventDto,
        startDate: updateEventDto.startDate
          ? new Date(updateEventDto.startDate)
          : undefined,
        endDate: updateEventDto.endDate
          ? new Date(updateEventDto.endDate)
          : undefined,
        registrationDeadline: updateEventDto.registrationDeadline
          ? new Date(updateEventDto.registrationDeadline)
          : undefined,
      };

      Object.assign(event, updatedData);
      const savedEvent = await this.eventRepository.save(event);

      this.logger.log(`Event updated successfully: ${savedEvent.id}`);
      return savedEvent;
    } catch (error) {
      this.logger.error(`Failed to update event ${id}: ${error.message}`);
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const event = await this.findOne(id);

      // Check if event has confirmed RSVPs
      if (event.confirmedRsvps > 0) {
        throw new ConflictException(
          'Cannot delete event with confirmed RSVPs. Cancel the event instead.',
        );
      }

      await this.eventRepository.remove(event);
      this.logger.log(`Event deleted successfully: ${id}`);
    } catch (error) {
      this.logger.error(`Failed to delete event ${id}: ${error.message}`);
      throw error;
    }
  }

  async publishEvent(id: string): Promise<Event> {
    try {
      const event = await this.findOne(id);

      if (event.status !== EventStatus.DRAFT) {
        throw new BadRequestException('Only draft events can be published');
      }

      // Validate event is ready for publishing
      const now = new Date();
      if (event.startDate <= now) {
        throw new BadRequestException('Cannot publish past events');
      }

      event.status = EventStatus.PUBLISHED;
      const savedEvent = await this.eventRepository.save(event);

      this.logger.log(`Event published successfully: ${savedEvent.id}`);
      return savedEvent;
    } catch (error) {
      this.logger.error(`Failed to publish event ${id}: ${error.message}`);
      throw error;
    }
  }

  async cancelEvent(id: string, reason?: string): Promise<Event> {
    try {
      const event = await this.findOne(id);

      if (event.status === EventStatus.CANCELLED) {
        throw new BadRequestException('Event is already cancelled');
      }

      if (event.status === EventStatus.COMPLETED) {
        throw new BadRequestException('Cannot cancel completed event');
      }

      event.status = EventStatus.CANCELLED;
      if (reason) {
        event.additionalInfo = `Cancelled: ${reason}`;
      }

      const savedEvent = await this.eventRepository.save(event);

      this.logger.log(`Event cancelled successfully: ${savedEvent.id}`);
      return savedEvent;
    } catch (error) {
      this.logger.error(`Failed to cancel event ${id}: ${error.message}`);
      throw error;
    }
  }

  async updateRsvpCounts(eventId: string): Promise<Event> {
    try {
      const event = await this.eventRepository
        .createQueryBuilder('event')
        .leftJoinAndSelect('event.rsvps', 'rsvp')
        .where('event.id = :eventId', { eventId })
        .getOne();

      if (!event) {
        throw new NotFoundException(`Event with ID ${eventId} not found`);
      }

      // Count confirmed and waitlisted RSVPs
      const confirmedCount = event.rsvps.filter(
        (rsvp) => rsvp.status === 'confirmed',
      ).length;
      const waitlistCount = event.rsvps.filter(
        (rsvp) => rsvp.status === 'waitlisted',
      ).length;

      event.confirmedRsvps = confirmedCount;
      event.waitlistCount = waitlistCount;

      return await this.eventRepository.save(event);
    } catch (error) {
      this.logger.error(
        `Failed to update RSVP counts for event ${eventId}: ${error.message}`,
      );
      throw error;
    }
  }

  async getEventStatistics(): Promise<EventStatistics> {
    try {
      const now = new Date();

      // Get basic counts
      const [
        totalEvents,
        upcomingEvents,
        pastEvents,
        draftEvents,
        publishedEvents,
        cancelledEvents,
      ] = await Promise.all([
        this.eventRepository.count(),
        this.eventRepository.count({
          where: { startDate: Between(now, new Date('2099-12-31')) },
        }),
        this.eventRepository.count({
          where: { endDate: Between(new Date('1900-01-01'), now) },
        }),
        this.eventRepository.count({ where: { status: EventStatus.DRAFT } }),
        this.eventRepository.count({ where: { status: EventStatus.PUBLISHED } }),
        this.eventRepository.count({ where: { status: EventStatus.CANCELLED } }),
      ]);

      // Get capacity and RSVP statistics
      const capacityStats = await this.eventRepository
        .createQueryBuilder('event')
        .select([
          'SUM(event.capacity) as totalCapacity',
          'SUM(event.confirmedRsvps) as totalRsvps',
        ])
        .getRawOne();

      const totalCapacity = parseInt(capacityStats.totalCapacity || 0);
      const totalRsvps = parseInt(capacityStats.totalRsvps || 0);
      const averageCapacityUtilization =
        totalCapacity > 0 ? (totalRsvps / totalCapacity) * 100 : 0;

      // Get events by type
      const eventTypeStats = await this.eventRepository
        .createQueryBuilder('event')
        .select(['event.eventType as type', 'COUNT(*) as count'])
        .groupBy('event.eventType')
        .getRawMany();

      const eventsByType = Object.values(EventType).reduce(
        (acc, type) => {
          acc[type] = 0;
          return acc;
        },
        {} as Record<EventType, number>,
      );

      eventTypeStats.forEach((stat) => {
        eventsByType[stat.type as EventType] = parseInt(stat.count);
      });

      // Get events by month (last 12 months)
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const monthlyStats = await this.eventRepository
        .createQueryBuilder('event')
        .select([
          'YEAR(event.createdAt) as year',
          'MONTH(event.createdAt) as month',
          'COUNT(*) as count',
        ])
        .where('event.createdAt >= :date', { date: twelveMonthsAgo })
        .groupBy('YEAR(event.createdAt), MONTH(event.createdAt)')
        .orderBy('year, month')
        .getRawMany();

      const eventsByMonth = monthlyStats.map((stat) => ({
        month: `${stat.year}-${String(stat.month).padStart(2, '0')}`,
        count: parseInt(stat.count),
      }));

      return {
        totalEvents,
        upcomingEvents,
        pastEvents,
        draftEvents,
        publishedEvents,
        cancelledEvents,
        totalCapacity,
        totalRsvps,
        averageCapacityUtilization: Math.round(averageCapacityUtilization * 100) / 100,
        eventsByType,
        eventsByMonth,
      };
    } catch (error) {
      this.logger.error(`Failed to get event statistics: ${error.message}`);
      throw error;
    }
  }

  async getUpcomingEvents(limit: number = 10): Promise<Event[]> {
    try {
      const now = new Date();
      return await this.eventRepository.find({
        where: {
          status: EventStatus.PUBLISHED,
          startDate: Between(now, new Date('2099-12-31')),
        },
        order: { startDate: 'ASC' },
        take: limit,
        relations: ['rsvps'],
      });
    } catch (error) {
      this.logger.error(`Failed to get upcoming events: ${error.message}`);
      throw error;
    }
  }

  async getEventsByOrganizer(organizerId: string): Promise<Event[]> {
    try {
      return await this.eventRepository.find({
        where: { organizerId },
        order: { startDate: 'DESC' },
        relations: ['rsvps'],
      });
    } catch (error) {
      this.logger.error(
        `Failed to get events for organizer ${organizerId}: ${error.message}`,
      );
      throw error;
    }
  }
}