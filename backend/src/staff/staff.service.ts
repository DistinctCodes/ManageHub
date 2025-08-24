import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateStaffDto } from './dto/create-staff.dto';
import { UpdateStaffDto } from './dto/update-staff.dto';
import { Staff } from './entities/staff.entity';

@Injectable()
export class StaffService {
  constructor(
    @InjectRepository(Staff)
    private staffRepository: Repository<Staff>,
  ) {}

  async create(createStaffDto: CreateStaffDto): Promise<Staff> {
    // Check if staff ID already exists
    const existingStaff = await this.staffRepository.findOne({
      where: { staffId: createStaffDto.staffId },
    });

    if (existingStaff) {
      throw new ConflictException('Staff ID already exists');
    }

    const staff = this.staffRepository.create(createStaffDto);
    return this.staffRepository.save(staff);
  }

  async findAll(): Promise<Staff[]> {
    return this.staffRepository.find({
      relations: ['shifts'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Staff> {
    const staff = await this.staffRepository.findOne({
      where: { id },
      relations: ['shifts', 'shifts.location'],
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    return staff;
  }

  async findByStaffId(staffId: string): Promise<Staff> {
    const staff = await this.staffRepository.findOne({
      where: { staffId },
      relations: ['shifts', 'shifts.location'],
    });

    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    return staff;
  }

  async update(id: string, updateStaffDto: UpdateStaffDto): Promise<Staff> {
    const staff = await this.findOne(id);

    // Check if trying to update to an existing staff ID
    if (updateStaffDto.staffId && updateStaffDto.staffId !== staff.staffId) {
      const existingStaff = await this.staffRepository.findOne({
        where: { staffId: updateStaffDto.staffId },
      });

      if (existingStaff) {
        throw new ConflictException('Staff ID already exists');
      }
    }

    Object.assign(staff, updateStaffDto);
    return this.staffRepository.save(staff);
  }

  async remove(id: string): Promise<void> {
    const staff = await this.findOne(id);
    await this.staffRepository.remove(staff);
  }

  async getActiveStaff(): Promise<Staff[]> {
    return this.staffRepository.find({
      where: { isActive: true },
      order: { firstName: 'ASC', lastName: 'ASC' },
    });
  }
}
