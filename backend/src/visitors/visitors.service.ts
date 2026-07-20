import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Visitor } from './entities/visitor.entity';
import { VisitorStatus } from './enums/visitor-status.enum';
import { CreateVisitorDto } from './dto/create-visitor.dto';
import { VisitorQueryDto } from './dto/visitor-query.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/enums/notification-type.enum';
import { EmailService } from '../email/email.service';

@Injectable()
export class VisitorsService {
  constructor(
    @InjectRepository(Visitor)
    private readonly visitorsRepository: Repository<Visitor>,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
  ) {}

  /** Host pre-registers a visitor. Sends confirmation email if email provided. */
  async create(
    hostUserId: string,
    dto: CreateVisitorDto,
  ): Promise<Visitor> {
    const visitor = this.visitorsRepository.create({
      hostUserId,
      visitorName: dto.visitorName,
      visitorEmail: dto.visitorEmail,
      visitorPhone: dto.visitorPhone,
      company: dto.company,
      purpose: dto.purpose,
      expectedArrival: dto.expectedArrival
        ? new Date(dto.expectedArrival)
        : undefined,
      notes: dto.notes,
      status: VisitorStatus.EXPECTED,
    });

    const saved = await this.visitorsRepository.save(visitor);

    if (saved.visitorEmail) {
      await this.emailService.sendTemplateEmail(
        saved.visitorEmail,
        'You have been registered as a visitor',
        'visitor-check-in',
        {
          visitorName: saved.visitorName,
          company: saved.company ?? '',
          expectedArrival: saved.expectedArrival?.toISOString() ?? 'TBD',
        },
      );
    }

    return saved;
  }

  /** Authenticated member views their own visitors (paginated). */
  async findMine(
    hostUserId: string,
    query: VisitorQueryDto,
  ) {
    const { page = 1, perPage = 10, status, dateFrom, dateTo } = query;

    const qb = this.visitorsRepository
      .createQueryBuilder('visitor')
      .where('visitor.hostUserId = :hostUserId', { hostUserId })
      .orderBy('visitor.createdAt', 'DESC')
      .skip((page - 1) * perPage)
      .take(perPage);

    if (status) {
      qb.andWhere('visitor.status = :status', { status });
    }
    if (dateFrom) {
      qb.andWhere('visitor.expectedArrival >= :dateFrom', {
        dateFrom: new Date(dateFrom),
      });
    }
    if (dateTo) {
      qb.andWhere('visitor.expectedArrival <= :dateTo', {
        dateTo: new Date(dateTo),
      });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, perPage };
  }

  /** Admin/staff view all visitors (filterable, paginated). */
  async findAll(query: VisitorQueryDto) {
    const { page = 1, perPage = 10, status, dateFrom, dateTo } = query;

    const qb = this.visitorsRepository
      .createQueryBuilder('visitor')
      .leftJoinAndSelect('visitor.host', 'host')
      .orderBy('visitor.createdAt', 'DESC')
      .skip((page - 1) * perPage)
      .take(perPage);

    if (status) {
      qb.andWhere('visitor.status = :status', { status });
    }
    if (dateFrom) {
      qb.andWhere('visitor.expectedArrival >= :dateFrom', {
        dateFrom: new Date(dateFrom),
      });
    }
    if (dateTo) {
      qb.andWhere('visitor.expectedArrival <= :dateTo', {
        dateTo: new Date(dateTo),
      });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, perPage };
  }

  /** Staff marks visitor as arrived. Notifies the host in-app. */
  async checkIn(id: string): Promise<Visitor> {
    const visitor = await this.findById(id);

    if (visitor.status !== VisitorStatus.EXPECTED) {
      throw new BadRequestException(
        `Cannot check in a visitor with status ${visitor.status}`,
      );
    }

    visitor.actualArrival = new Date();
    visitor.status = VisitorStatus.CHECKED_IN;
    const saved = await this.visitorsRepository.save(visitor);

    await this.notificationsService.create({
      userId: visitor.hostUserId,
      type: NotificationType.GENERAL,
      title: 'Your visitor has arrived',
      message: `Your visitor ${visitor.visitorName} has arrived.`,
      metadata: { visitorId: visitor.id },
    });

    return saved;
  }

  /** Staff marks visitor departure. */
  async checkOut(id: string): Promise<Visitor> {
    const visitor = await this.findById(id);

    if (visitor.status !== VisitorStatus.CHECKED_IN) {
      throw new BadRequestException(
        `Cannot check out a visitor with status ${visitor.status}`,
      );
    }

    visitor.actualDeparture = new Date();
    visitor.status = VisitorStatus.CHECKED_OUT;
    return this.visitorsRepository.save(visitor);
  }

  /** Host cancels expected visit. */
  async cancel(id: string, requestingUserId: string): Promise<Visitor> {
    const visitor = await this.findById(id);

    if (visitor.hostUserId !== requestingUserId) {
      throw new ForbiddenException(
        'Only the host can cancel this visitor entry',
      );
    }

    if (visitor.status !== VisitorStatus.EXPECTED) {
      throw new BadRequestException(
        `Cannot cancel a visitor with status ${visitor.status}`,
      );
    }

    visitor.status = VisitorStatus.CANCELLED;
    return this.visitorsRepository.save(visitor);
  }

  private async findById(id: string): Promise<Visitor> {
    const visitor = await this.visitorsRepository.findOne({ where: { id } });
    if (!visitor) {
      throw new NotFoundException(`Visitor ${id} not found`);
    }
    return visitor;
  }
}