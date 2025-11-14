import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Staff } from './entities/staff.entity';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(Staff)
    private readonly staffRepository: Repository<Staff>,
  ) {}

  create(createStaffDto: CreateStaffDto) {
    const staff = this.staffRepository.create(createStaffDto);
    return this.staffRepository.save(staff);
  }

  findAll() {
    return this.staffRepository.find();
  }

  async findOne(id: string) {
    const staff = await this.staffRepository.findOneBy({ id });
    if (!staff) {
      throw new NotFoundException(`Staff with ID "${id}" not found`);
    }
    return staff;
  }

  async update(id: string, updateStaffDto: UpdateStaffDto) {
    const staff = await this.staffRepository.preload({
      id: id,
      ...updateStaffDto,
    });
    if (!staff) {
      throw new NotFoundException(`Staff with ID "${id}" not found`);
    }
    return this.staffRepository.save(staff);
  }

  async remove(id: string) {
    const staff = await this.findOne(id);
    await this.staffRepository.remove(staff);
    return { message: `Staff with ID "${id}" deleted successfully` };
  }
}
