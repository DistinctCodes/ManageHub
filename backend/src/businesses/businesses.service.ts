import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from './entities/business.entity';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBusinessDto } from './dto/update-business.dto';

@Injectable()
export class BusinessesService {
  constructor(
    @InjectRepository(Business)
    private readonly businessRepo: Repository<Business>,
  ) {}

  async create(createBusinessDto: CreateBusinessDto): Promise<Business> {
    const business = this.businessRepo.create(createBusinessDto);
    return await this.businessRepo.save(business);
  }

  async findAll(): Promise<Business[]> {
    return await this.businessRepo.find({
      order: { createdAt: 'DESC' },
    });
  }

  async findActive(): Promise<Business[]> {
    return await this.businessRepo.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findByCategory(category: string): Promise<Business[]> {
    return await this.businessRepo.find({
      where: { category, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Business> {
    const business = await this.businessRepo.findOne({ where: { id } });
    if (!business) {
      throw new NotFoundException(`Business with ID ${id} not found`);
    }
    return business;
  }

  async update(
    id: string,
    updateBusinessDto: UpdateBusinessDto,
  ): Promise<Business> {
    const business = await this.findOne(id);
    Object.assign(business, updateBusinessDto);
    return await this.businessRepo.save(business);
  }

  async remove(id: string): Promise<void> {
    const business = await this.findOne(id);
    await this.businessRepo.remove(business);
  }

  async deactivate(id: string): Promise<Business> {
    return await this.update(id, { isActive: false });
  }

  async activate(id: string): Promise<Business> {
    return await this.update(id, { isActive: true });
  }
}
