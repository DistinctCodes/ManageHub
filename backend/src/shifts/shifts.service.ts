import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { Staff } from 'src/staff/entities/staff.entity';
import { Shift, ShiftStatus } from './entities/shift.entity';
import { Location } from 'src/location/entities/location.entity';

@Injectable()
export class ShiftService {
  constructor(
    @InjectRepository(Shift)
    private shiftRepository: Repository<Shift>,
    @InjectRepository(Staff)
    private staffRepository: Repository<Staff>,
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
  ) {}

  async create(createShiftDto: CreateShiftDto): Promise<Shift> {
    // Verify staff exists
    const staff = await this.staffRepository.findOne({
      where: { id: createShiftDto.staffId },
    });
    if (!staff) {
      throw new NotFoundException('Staff member not found');
    }

    // Verify location exists
    const location = await this.locationRepository.findOne({
      where: { id: createShiftDto.locationId },
    });
    if (!location) {
      throw new NotFoundException('Location not found');
    }

    // Check for overlapping shifts
    await this.checkForOverlappingShifts(
      createShiftDto.staffId,
      createShiftDto.shiftDate,
      createShiftDto.startTime,
      createShiftDto.endTime,
    );

    const shift = this.shiftRepository.create({
      ...createShiftDto,
      staff,
      location,
    });

    return this.shiftRepository.save(shift);
  }

  async findAll(): Promise<Shift[]> {
    return this.shiftRepository.find({
      order: { shiftDate: 'DESC', startTime: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Shift> {
    const shift = await this.shiftRepository.findOne({
      where: { id },
    });

    if (!shift) {
      throw new NotFoundException('Shift not found');
    }

    return shift;
  }

  async update(id: string, updateShiftDto: UpdateShiftDto): Promise<Shift> {
    const shift = await this.findOne(id);

    // If updating staff or location, verify they exist
    if (updateShiftDto.staffId) {
      const staff = await this.staffRepository.findOne({
        where: { id: updateShiftDto.staffId },
      });
      if (!staff) {
        throw new NotFoundException('Staff member not found');
      }
      shift.staff = staff;
    }

    if (updateShiftDto.locationId) {
      const location = await this.locationRepository.findOne({
        where: { id: updateShiftDto.locationId },
      });
      if (!location) {
        throw new NotFoundException('Location not found');
      }
      shift.location = location;
    }

    // Check for overlapping shifts if date or time is being updated
    if (
      updateShiftDto.shiftDate ||
      updateShiftDto.startTime ||
      updateShiftDto.endTime ||
      updateShiftDto.staffId
    ) {
      await this.checkForOverlappingShifts(
        updateShiftDto.staffId || shift.staff.id,
        updateShiftDto.shiftDate || shift.shiftDate.toISOString().split('T')[0],
        updateShiftDto.startTime || shift.startTime,
        updateShiftDto.endTime || shift.endTime,
        id, // Exclude current shift from overlap check
      );
    }

    Object.assign(shift, updateShiftDto);
    return this.shiftRepository.save(shift);
  }

  async remove(id: string): Promise<void> {
    const shift = await this.findOne(id);
    await this.shiftRepository.remove(shift);
  }

  async getShiftsByStaff(staffId: string): Promise<Shift[]> {
    return this.shiftRepository.find({
      where: { staff: { id: staffId } },
      order: { shiftDate: 'DESC', startTime: 'ASC' },
    });
  }

  async getShiftsByLocation(locationId: string): Promise<Shift[]> {
    return this.shiftRepository.find({
      where: { location: { id: locationId } },
      order: { shiftDate: 'DESC', startTime: 'ASC' },
    });
  }

  async getShiftsByDateRange(
    startDate: string,
    endDate: string,
  ): Promise<Shift[]> {
    return this.shiftRepository.find({
      where: {
        shiftDate: Between(new Date(startDate), new Date(endDate)),
      },
      order: { shiftDate: 'ASC', startTime: 'ASC' },
    });
  }

  async updateShiftStatus(id: string, status: ShiftStatus): Promise<Shift> {
    const shift = await this.findOne(id);
    shift.status = status;
    return this.shiftRepository.save(shift);
  }

  private async checkForOverlappingShifts(
    staffId: string,
    shiftDate: string,
    startTime: string,
    endTime: string,
    excludeShiftId?: string,
  ): Promise<void> {
    const query = this.shiftRepository
      .createQueryBuilder('shift')
      .where('shift.staffId = :staffId', { staffId })
      .andWhere('shift.shiftDate = :shiftDate', { shiftDate })
      .andWhere('shift.status != :cancelledStatus', {
        cancelledStatus: ShiftStatus.CANCELLED,
      })
      .andWhere('(shift.startTime < :endTime AND shift.endTime > :startTime)', {
        startTime,
        endTime,
      });

    if (excludeShiftId) {
      query.andWhere('shift.id != :excludeShiftId', { excludeShiftId });
    }

    const overlappingShift = await query.getOne();

    if (overlappingShift) {
      throw new BadRequestException(
        'Staff member already has an overlapping shift at this time',
      );
    }
  }
}
