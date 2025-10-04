import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Company } from './entities/company.entity';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private repo: Repository<Company>,
  ) {}

  create(dto: CreateCompanyDto) {
    const company = this.repo.create(dto);
    return this.repo.save(company);
  }

  findAll() {
    return this.repo.find({ relations: ['branches', 'departments'] });
  }

  async findOne(id: number) {
    const company = await this.repo.findOne({
      where: { id },
      relations: ['branches', 'departments'],
    });
    if (!company) throw new NotFoundException('Company not found');
    return company;
  }

  async update(id: number, dto: UpdateCompanyDto) {
    const company = await this.findOne(id);
    Object.assign(company, dto);
    return this.repo.save(company);
  }

  async remove(id: number) {
    const company = await this.findOne(id);
    await this.repo.remove(company);
  }
}
