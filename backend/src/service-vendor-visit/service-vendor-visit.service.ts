import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like } from 'typeorm';
import { ServiceVendorVisit } from './entities/service-vendor-visit.entity';
import { CreateServiceVendorVisitDto, UpdateServiceVendorVisitDto, ServiceVendorVisitQueryDto } from './dto/create-service-vendor-visit.dto';

@Injectable()
export class ServiceVendorVisitService {
  constructor(
    @InjectRepository(ServiceVendorVisit)
    private readonly serviceVendorVisitRepository: Repository<ServiceVendorVisit>,
  ) {}

  async create(createDto: CreateServiceVendorVisitDto): Promise<ServiceVendorVisit> {
    const visit = this.serviceVendorVisitRepository.create({
      ...createDto,
      visitTime: new Date(createDto.visitTime),
      status: 'Scheduled',
      deleted: false,
    });
    return await this.serviceVendorVisitRepository.save(visit);
  }

  async findAll(queryDto: ServiceVendorVisitQueryDto & { showDeleted?: boolean; status?: string }) {
    const { companyName, service, fromDate, toDate, page, limit, showDeleted, status } = queryDto;
    const query = this.serviceVendorVisitRepository.createQueryBuilder('visit');

    // Only non-deleted by default
    if (!showDeleted) {
      query.andWhere('visit.deleted = false');
    }
    if (status) {
      query.andWhere('visit.status = :status', { status });
    }
    if (companyName) {
      query.andWhere('visit.companyName ILIKE :companyName', { 
        companyName: `%${companyName}%` 
      });
    }
    if (service) {
      query.andWhere('visit.service ILIKE :service', { 
        service: `%${service}%` 
      });
    }
    if (fromDate && toDate) {
      query.andWhere('visit.visitTime BETWEEN :fromDate AND :toDate', {
        fromDate: new Date(fromDate),
        toDate: new Date(toDate),
      });
    } else if (fromDate) {
      query.andWhere('visit.visitTime >= :fromDate', {
        fromDate: new Date(fromDate),
      });
    } else if (toDate) {
      query.andWhere('visit.visitTime <= :toDate', {
        toDate: new Date(toDate),
      });
    }
    // Apply pagination
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);
    // Order by visit time (most recent first)
    query.orderBy('visit.visitTime', 'DESC');
    const [visits, total] = await query.getManyAndCount();
    return {
      data: visits,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<ServiceVendorVisit> {
    const visit = await this.serviceVendorVisitRepository.findOne({
      where: { id },
    });

    if (!visit) {
      throw new NotFoundException(`Service vendor visit with ID ${id} not found`);
    }

    return visit;
  }

  async update(id: string, updateDto: UpdateServiceVendorVisitDto & { status?: string }): Promise<ServiceVendorVisit> {
    const visit = await this.findOne(id);
    const updateData = {
      ...updateDto,
      ...(updateDto.visitTime && { visitTime: new Date(updateDto.visitTime) }),
      ...(updateDto.status && { status: updateDto.status }),
    };
    Object.assign(visit, updateData);
    return await this.serviceVendorVisitRepository.save(visit);
  }

  async remove(id: string): Promise<void> {
    const visit = await this.findOne(id);
    visit.deleted = true;
    await this.serviceVendorVisitRepository.save(visit);
  }

  async restore(id: string): Promise<ServiceVendorVisit> {
    const visit = await this.findOne(id);
    visit.deleted = false;
    return await this.serviceVendorVisitRepository.save(visit);
  }

  async getVisitStats() {
    const totalVisits = await this.serviceVendorVisitRepository.count();
    
    const topCompanies = await this.serviceVendorVisitRepository
      .createQueryBuilder('visit')
      .select('visit.companyName', 'companyName')
      .addSelect('COUNT(*)', 'visitCount')
      .groupBy('visit.companyName')
      .orderBy('visitCount', 'DESC')
      .limit(5)
      .getRawMany();

    const topServices = await this.serviceVendorVisitRepository
      .createQueryBuilder('visit')
      .select('visit.service', 'service')
      .addSelect('COUNT(*)', 'visitCount')
      .groupBy('visit.service')
      .orderBy('visitCount', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      totalVisits,
      topCompanies,
      topServices,
    };
  }
}