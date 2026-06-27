import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Visitor } from './entities/visitor.entity';
import { CreateVisitorDto } from './dto/create-visitor.dto';
import { VisitorQueryDto } from './dto/visitor-query.dto';
import { User } from '../users/entities/user.entity';
import { EmailService } from '../email/email.service';
import { VisitorStatus } from './enums/visitor-status.enum';

@Injectable()
export class VisitorsService {
  constructor(
    @InjectRepository(Visitor)
    private readonly visitorRepository: Repository<Visitor>,
    private readonly emailService: EmailService,
  ) {}

  async create(
    createVisitorDto: CreateVisitorDto,
    hostMember: User,
  ): Promise<Visitor> {
    const visitor = this.visitorRepository.create({
      ...createVisitorDto,
      hostMemberId: hostMember.id,
      qrCode: uuidv4(),
    });

    return this.visitorRepository.save(visitor);
  }

  async findAll(queryDto: VisitorQueryDto) {
    const { perPage, page, date, status, hostMemberId } = queryDto;
    const query = this.visitorRepository.createQueryBuilder('visitor');

    if (date) {
      query.andWhere('visitor.expectedDate = :date', { date });
    }

    if (status) {
      query.andWhere('visitor.status = :status', { status });
    }

    if (hostMemberId) {
      query.andWhere('visitor.hostMemberId = :hostMemberId', { hostMemberId });
    }

    const offset = (page - 1) * perPage;
    query.leftJoinAndSelect('visitor.hostMember', 'hostMember')
         .select(['visitor', 'hostMember.id', 'hostMember.firstname', 'hostMember.lastname', 'hostMember.email']);
    const [visitors, total] = await query.skip(offset).take(perPage).getManyAndCount();

    return {
      data: visitors,
      total,
      page,
      perPage,
    };
  }

  async findMy(hostMemberId: string, queryDto: VisitorQueryDto) {
    const { perPage, page, date, status } = queryDto;
    const query = this.visitorRepository.createQueryBuilder('visitor');

    query.andWhere('visitor.hostMemberId = :hostMemberId', { hostMemberId });

    if (date) {
      query.andWhere('visitor.expectedDate = :date', { date });
    }

    if (status) {
      query.andWhere('visitor.status = :status', { status });
    }

    const offset = (page - 1) * perPage;
    const [visitors, total] = await query.skip(offset).take(perPage).getManyAndCount();

    return {
      data: visitors,
      total,
      page,
      perPage,
    };
  }

  async findOne(id: string): Promise<Visitor> {
    const visitor = await this.visitorRepository.findOne({
      where: { id },
      relations: ['hostMember'],
    });
    if (!visitor) {
      throw new NotFoundException(`Visitor with ID "${id}" not found`);
    }
    return visitor;
  }

  async checkIn(id: string): Promise<Visitor> {
    const visitor = await this.findOne(id);
    if (visitor.status !== VisitorStatus.EXPECTED) {
      throw new Error('Visitor cannot be checked in.');
    }
    visitor.checkInTime = new Date();
    visitor.status = VisitorStatus.CHECKED_IN;

    const updatedVisitor = await this.visitorRepository.save(visitor);

    // Send email to host member
    await this.emailService.sendVisitorCheckInEmail(
      visitor.hostMember,
      updatedVisitor,
    );

    return updatedVisitor;
  }

  async checkOut(id: string): Promise<Visitor> {
    const visitor = await this.findOne(id);
    if (visitor.status !== VisitorStatus.CHECKED_IN) {
      throw new Error('Visitor cannot be checked out.');
    }
    visitor.checkOutTime = new Date();
    visitor.status = VisitorStatus.CHECKED_OUT;
    return this.visitorRepository.save(visitor);
  }

  async remove(id: string, user: User): Promise<void> {
    const visitor = await this.findOne(id);

    // Admin or the host member can delete
    if (user.role !== 'admin' && visitor.hostMemberId !== user.id) {
      throw new Error('You are not authorized to delete this visitor.');
    }

    await this.visitorRepository.delete(id);
  }
}
