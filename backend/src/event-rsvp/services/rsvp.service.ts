import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like } from 'typeorm';
import {
  EventRsvp,
  RsvpStatus,
  RsvpSource,
} from '../entities/event-rsvp.entity';
import { Event, EventStatus } from '../entities/event.entity';
import { CreateRsvpDto } from '../dto/create-rsvp.dto';
import { UpdateRsvpDto } from '../dto/update-rsvp.dto';
import { RsvpQueryDto } from '../dto/rsvp-query.dto';
import { EventService } from './event.service';
import { EmailNotificationService } from './email-notification.service';

export interface RsvpStatistics {
  totalRsvps: number;
  confirmedRsvps: number;
  waitlistedRsvps: number;
  cancelledRsvps: number;
  attendedRsvps: number;
  noShowRsvps: number;
  rsvpsBySource: Record<RsvpSource, number>;
  rsvpsByMonth: Array<{ month: string; count: number }>;
  topEvents: Array<{ eventId: string; eventTitle: string; rsvpCount: number }>;
}

export interface PaginatedRsvps {
  data: EventRsvp[];
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
export class RsvpService {
  private readonly logger = new Logger(RsvpService.name);

  constructor(
    @InjectRepository(EventRsvp)
    private rsvpRepository: Repository<EventRsvp>,
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    private eventService: EventService,
    private emailNotificationService: EmailNotificationService,
  ) {}

  async createRsvp(
    eventId: string,
    createRsvpDto: CreateRsvpDto,
  ): Promise<EventRsvp> {
    try {
      // Get event with current RSVP data
      const event = await this.eventService.findOne(eventId);

      // Validate event status
      if (event.status !== EventStatus.PUBLISHED) {
        throw new BadRequestException(
          'Event is not published and open for registration',
        );
      }

      // Check if registration is still open
      if (!event.registrationOpen) {
        throw new BadRequestException('Registration deadline has passed');
      }

      // Check for duplicate RSVP
      const existingRsvp = await this.rsvpRepository.findOne({
        where: {
          eventId,
          attendeeEmail: createRsvpDto.attendeeEmail,
        },
      });

      if (existingRsvp && !existingRsvp.isCancelled) {
        throw new ConflictException(
          'User has already registered for this event',
        );
      }

      // Determine RSVP status based on capacity
      const isWaitlisted = event.isFullyBooked && event.allowWaitlist;
      const status = isWaitlisted
        ? RsvpStatus.WAITLISTED
        : RsvpStatus.CONFIRMED;

      // Calculate waitlist position if needed
      let waitlistPosition: number | null = null;
      if (isWaitlisted) {
        const waitlistCount = await this.rsvpRepository.count({
          where: {
            eventId,
            status: RsvpStatus.WAITLISTED,
          },
        });
        waitlistPosition = waitlistCount + 1;
      }

      // Create RSVP
      const rsvp = this.rsvpRepository.create({
        ...createRsvpDto,
        eventId,
        status,
        waitlistPosition,
        confirmedAt: status === RsvpStatus.CONFIRMED ? new Date() : null,
      });

      const savedRsvp = await this.rsvpRepository.save(rsvp);

      // Update event RSVP counts
      await this.eventService.updateRsvpCounts(eventId);

      // Send appropriate email notification
      const fullRsvp = await this.findOne(savedRsvp.id);
      if (status === RsvpStatus.CONFIRMED) {
        await this.emailNotificationService.sendRsvpConfirmation(
          fullRsvp,
          event,
        );
      } else if (status === RsvpStatus.WAITLISTED) {
        await this.emailNotificationService.sendWaitlistNotification(
          fullRsvp,
          event,
        );
      }

      this.logger.log(
        `RSVP created successfully: ${savedRsvp.id} for event ${eventId} (${status})`,
      );

      return fullRsvp;
    } catch (error) {
      this.logger.error(
        `Failed to create RSVP for event ${eventId}: ${error.message}`,
      );
      throw error;
    }
  }

  async findAll(queryDto: RsvpQueryDto): Promise<PaginatedRsvps> {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        eventId,
        userId,
        attendeeEmail,
        search,
        isVip,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
      } = queryDto;

      const queryBuilder = this.rsvpRepository
        .createQueryBuilder('rsvp')
        .leftJoinAndSelect('rsvp.event', 'event');

      // Apply filters
      if (status) {
        queryBuilder.andWhere('rsvp.status = :status', { status });
      }

      if (eventId) {
        queryBuilder.andWhere('rsvp.eventId = :eventId', { eventId });
      }

      if (userId) {
        queryBuilder.andWhere('rsvp.userId = :userId', { userId });
      }

      if (attendeeEmail) {
        queryBuilder.andWhere('rsvp.attendeeEmail = :attendeeEmail', {
          attendeeEmail,
        });
      }

      if (search) {
        queryBuilder.andWhere(
          '(rsvp.attendeeName LIKE :search OR rsvp.attendeeEmail LIKE :search OR rsvp.attendeeOrganization LIKE :search)',
          { search: `%${search}%` },
        );
      }

      if (typeof isVip === 'boolean') {
        queryBuilder.andWhere('rsvp.isVip = :isVip', { isVip });
      }

      // Apply sorting
      const validSortFields = [
        'createdAt',
        'updatedAt',
        'attendeeName',
        'status',
        'confirmedAt',
        'waitlistPosition',
      ];
      const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
      queryBuilder.orderBy(`rsvp.${sortField}`, sortOrder);

      // Apply pagination
      const skip = (page - 1) * limit;
      queryBuilder.skip(skip).take(limit);

      const [rsvps, total] = await queryBuilder.getManyAndCount();

      return {
        data: rsvps,
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
      this.logger.error(`Failed to fetch RSVPs: ${error.message}`);
      throw error;
    }
  }

  async findOne(id: string): Promise<EventRsvp> {
    try {
      const rsvp = await this.rsvpRepository.findOne({
        where: { id },
        relations: ['event'],
      });

      if (!rsvp) {
        throw new NotFoundException(`RSVP with ID ${id} not found`);
      }

      return rsvp;
    } catch (error) {
      this.logger.error(`Failed to fetch RSVP ${id}: ${error.message}`);
      throw error;
    }
  }

  async update(id: string, updateRsvpDto: UpdateRsvpDto): Promise<EventRsvp> {
    try {
      const rsvp = await this.findOne(id);

      // Handle status changes
      if (updateRsvpDto.status && updateRsvpDto.status !== rsvp.status) {
        await this.handleStatusChange(
          rsvp,
          updateRsvpDto.status,
          updateRsvpDto,
        );
      }

      // Update other fields
      Object.assign(rsvp, updateRsvpDto);
      const savedRsvp = await this.rsvpRepository.save(rsvp);

      // Update event RSVP counts
      await this.eventService.updateRsvpCounts(rsvp.eventId);

      this.logger.log(`RSVP updated successfully: ${savedRsvp.id}`);
      return savedRsvp;
    } catch (error) {
      this.logger.error(`Failed to update RSVP ${id}: ${error.message}`);
      throw error;
    }
  }

  async cancelRsvp(id: string, reason?: string): Promise<EventRsvp> {
    try {
      const rsvp = await this.findOne(id);

      if (!rsvp.canCancel) {
        throw new BadRequestException(
          'RSVP cannot be cancelled in its current state',
        );
      }

      const wasConfirmed = rsvp.status === RsvpStatus.CONFIRMED;

      rsvp.status = RsvpStatus.CANCELLED;
      rsvp.cancelledAt = new Date();
      rsvp.cancellationReason = reason || 'User cancelled';

      const savedRsvp = await this.rsvpRepository.save(rsvp);

      // If cancelled RSVP was confirmed, promote next waitlisted person
      if (wasConfirmed) {
        await this.promoteFromWaitlist(rsvp.eventId);
      }

      // Update event RSVP counts
      await this.eventService.updateRsvpCounts(rsvp.eventId);

      this.logger.log(`RSVP cancelled successfully: ${savedRsvp.id}`);
      return savedRsvp;
    } catch (error) {
      this.logger.error(`Failed to cancel RSVP ${id}: ${error.message}`);
      throw error;
    }
  }

  async checkInAttendee(id: string): Promise<EventRsvp> {
    try {
      const rsvp = await this.findOne(id);

      if (!rsvp.canCheckIn) {
        throw new BadRequestException('Attendee cannot be checked in');
      }

      rsvp.status = RsvpStatus.ATTENDED;
      rsvp.checkedInAt = new Date();

      const savedRsvp = await this.rsvpRepository.save(rsvp);

      // Send check-in confirmation email
      await this.emailNotificationService.sendCheckInConfirmation(
        savedRsvp,
        rsvp.event,
      );

      this.logger.log(`Attendee checked in successfully: ${savedRsvp.id}`);
      return savedRsvp;
    } catch (error) {
      this.logger.error(`Failed to check in attendee ${id}: ${error.message}`);
      throw error;
    }
  }

  async markAsNoShow(id: string): Promise<EventRsvp> {
    try {
      const rsvp = await this.findOne(id);

      if (rsvp.status !== RsvpStatus.CONFIRMED) {
        throw new BadRequestException(
          'Only confirmed RSVPs can be marked as no-show',
        );
      }

      rsvp.status = RsvpStatus.NO_SHOW;
      const savedRsvp = await this.rsvpRepository.save(rsvp);

      this.logger.log(`RSVP marked as no-show: ${savedRsvp.id}`);
      return savedRsvp;
    } catch (error) {
      this.logger.error(
        `Failed to mark RSVP ${id} as no-show: ${error.message}`,
      );
      throw error;
    }
  }

  async getEventRsvps(eventId: string): Promise<EventRsvp[]> {
    try {
      return await this.rsvpRepository.find({
        where: { eventId },
        order: { createdAt: 'ASC' },
        relations: ['event'],
      });
    } catch (error) {
      this.logger.error(
        `Failed to get RSVPs for event ${eventId}: ${error.message}`,
      );
      throw error;
    }
  }

  async getWaitlist(eventId: string): Promise<EventRsvp[]> {
    try {
      return await this.rsvpRepository.find({
        where: {
          eventId,
          status: RsvpStatus.WAITLISTED,
        },
        order: { waitlistPosition: 'ASC' },
        relations: ['event'],
      });
    } catch (error) {
      this.logger.error(
        `Failed to get waitlist for event ${eventId}: ${error.message}`,
      );
      throw error;
    }
  }

  async getUserRsvps(userId: string): Promise<EventRsvp[]> {
    try {
      return await this.rsvpRepository.find({
        where: { userId },
        order: { createdAt: 'DESC' },
        relations: ['event'],
      });
    } catch (error) {
      this.logger.error(
        `Failed to get RSVPs for user ${userId}: ${error.message}`,
      );
      throw error;
    }
  }

  async getRsvpStatistics(): Promise<RsvpStatistics> {
    try {
      // Get basic counts
      const [
        totalRsvps,
        confirmedRsvps,
        waitlistedRsvps,
        cancelledRsvps,
        attendedRsvps,
        noShowRsvps,
      ] = await Promise.all([
        this.rsvpRepository.count(),
        this.rsvpRepository.count({ where: { status: RsvpStatus.CONFIRMED } }),
        this.rsvpRepository.count({ where: { status: RsvpStatus.WAITLISTED } }),
        this.rsvpRepository.count({ where: { status: RsvpStatus.CANCELLED } }),
        this.rsvpRepository.count({ where: { status: RsvpStatus.ATTENDED } }),
        this.rsvpRepository.count({ where: { status: RsvpStatus.NO_SHOW } }),
      ]);

      // Get RSVPs by source
      const sourceStats = await this.rsvpRepository
        .createQueryBuilder('rsvp')
        .select(['rsvp.source as source', 'COUNT(*) as count'])
        .groupBy('rsvp.source')
        .getRawMany();

      const rsvpsBySource = Object.values(RsvpSource).reduce(
        (acc, source) => {
          acc[source] = 0;
          return acc;
        },
        {} as Record<RsvpSource, number>,
      );

      sourceStats.forEach((stat) => {
        rsvpsBySource[stat.source as RsvpSource] = parseInt(stat.count);
      });

      // Get RSVPs by month (last 12 months)
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

      const monthlyStats = await this.rsvpRepository
        .createQueryBuilder('rsvp')
        .select([
          'YEAR(rsvp.createdAt) as year',
          'MONTH(rsvp.createdAt) as month',
          'COUNT(*) as count',
        ])
        .where('rsvp.createdAt >= :date', { date: twelveMonthsAgo })
        .groupBy('YEAR(rsvp.createdAt), MONTH(rsvp.createdAt)')
        .orderBy('year, month')
        .getRawMany();

      const rsvpsByMonth = monthlyStats.map((stat) => ({
        month: `${stat.year}-${String(stat.month).padStart(2, '0')}`,
        count: parseInt(stat.count),
      }));

      // Get top events by RSVP count
      const topEventsStats = await this.rsvpRepository
        .createQueryBuilder('rsvp')
        .leftJoin('rsvp.event', 'event')
        .select([
          'rsvp.eventId as eventId',
          'event.title as eventTitle',
          'COUNT(*) as rsvpCount',
        ])
        .groupBy('rsvp.eventId, event.title')
        .orderBy('COUNT(*)', 'DESC')
        .limit(10)
        .getRawMany();

      const topEvents = topEventsStats.map((stat) => ({
        eventId: stat.eventId,
        eventTitle: stat.eventTitle,
        rsvpCount: parseInt(stat.rsvpCount),
      }));

      return {
        totalRsvps,
        confirmedRsvps,
        waitlistedRsvps,
        cancelledRsvps,
        attendedRsvps,
        noShowRsvps,
        rsvpsBySource,
        rsvpsByMonth,
        topEvents,
      };
    } catch (error) {
      this.logger.error(`Failed to get RSVP statistics: ${error.message}`);
      throw error;
    }
  }

  private async handleStatusChange(
    rsvp: EventRsvp,
    newStatus: RsvpStatus,
    updateData: UpdateRsvpDto,
  ): Promise<void> {
    const oldStatus = rsvp.status;

    switch (newStatus) {
      case RsvpStatus.CONFIRMED:
        if (oldStatus === RsvpStatus.WAITLISTED) {
          rsvp.confirmedAt = new Date();
          rsvp.waitlistPosition = null;
        }
        break;

      case RsvpStatus.CANCELLED:
        rsvp.cancelledAt = new Date();
        rsvp.cancellationReason =
          updateData.cancellationReason || 'Status changed to cancelled';
        if (oldStatus === RsvpStatus.CONFIRMED) {
          await this.promoteFromWaitlist(rsvp.eventId);
        }
        break;

      case RsvpStatus.ATTENDED:
        if (oldStatus === RsvpStatus.CONFIRMED) {
          rsvp.checkedInAt = new Date();
        }
        break;

      case RsvpStatus.WAITLISTED:
        if (oldStatus === RsvpStatus.CONFIRMED) {
          const waitlistCount = await this.rsvpRepository.count({
            where: {
              eventId: rsvp.eventId,
              status: RsvpStatus.WAITLISTED,
            },
          });
          rsvp.waitlistPosition = waitlistCount + 1;
          rsvp.confirmedAt = null;
        }
        break;
    }
  }

  private async promoteFromWaitlist(eventId: string): Promise<void> {
    try {
      // Get next person on waitlist
      const nextInLine = await this.rsvpRepository.findOne({
        where: {
          eventId,
          status: RsvpStatus.WAITLISTED,
        },
        order: { waitlistPosition: 'ASC' },
      });

      if (nextInLine) {
        // Check if there's capacity
        const event = await this.eventService.findOne(eventId);
        if (event.availableSlots > 0) {
          nextInLine.status = RsvpStatus.CONFIRMED;
          nextInLine.confirmedAt = new Date();
          nextInLine.waitlistPosition = null;

          await this.rsvpRepository.save(nextInLine);

          // Send promotion email
          await this.emailNotificationService.sendPromotionFromWaitlist(
            nextInLine,
            event,
          );

          // Update waitlist positions for remaining people
          await this.updateWaitlistPositions(eventId);

          this.logger.log(
            `Promoted RSVP ${nextInLine.id} from waitlist for event ${eventId}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Failed to promote from waitlist for event ${eventId}: ${error.message}`,
      );
    }
  }

  private async updateWaitlistPositions(eventId: string): Promise<void> {
    try {
      const waitlistedRsvps = await this.rsvpRepository.find({
        where: {
          eventId,
          status: RsvpStatus.WAITLISTED,
        },
        order: { waitlistPosition: 'ASC' },
      });

      for (let i = 0; i < waitlistedRsvps.length; i++) {
        waitlistedRsvps[i].waitlistPosition = i + 1;
      }

      await this.rsvpRepository.save(waitlistedRsvps);
    } catch (error) {
      this.logger.error(
        `Failed to update waitlist positions for event ${eventId}: ${error.message}`,
      );
    }
  }
}
