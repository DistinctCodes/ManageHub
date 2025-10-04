import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Department } from './entities/department.entity';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(
    @InjectRepository(Department)
    private repo: Repository<Department>,
  ) {}

  create(dto: CreateDepartmentDto) {
    const department = this.repo.create(dto);
    return this.repo.save(department);
  }

  findAll() {
    return this.repo.find({ relations: ['company', 'branch'] });
  }

  async findOne(id: number) {
    const department = await this.repo.findOne({
      where: { id },
      relations: ['company', 'branch'],
    });
    if (!department) throw new NotFoundException('Department not found');
    return department;
  }

  async update(id: number, dto: UpdateDepartmentDto) {
    const department = await this.findOne(id);
    Object.assign(department, dto);
    return this.repo.save(department);
  }

  async remove(id: number) {
    const department = await this.findOne(id);
    await this.repo.remove(department);
  }
}
