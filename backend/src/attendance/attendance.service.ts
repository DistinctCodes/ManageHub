import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attendance } from './entities/attendance.entity';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private readonly attendanceRepository: Repository<Attendance>,
  ) {}

  async create(createAttendanceDto: CreateAttendanceDto): Promise<Attendance> {
    const { staffId, clockIn } = createAttendanceDto;

    const newAttendance = this.attendanceRepository.create({
      clockIn: new Date(clockIn),
      staff: { id: staffId },
      clockOut: null,
      totalHours: null,
    });

    return this.attendanceRepository.save(newAttendance);
  }

  findAll() {
    return this.attendanceRepository.find({ relations: ['staff'] });
  }

  async findOne(id: string) {
    const record = await this.attendanceRepository.findOne({
      where: { id },
      relations: ['staff'],
    });
    if (!record) {
      throw new NotFoundException(
        `Attendance record with ID "${id}" not found`,
      );
    }
    return record;
  }

  async update(
    id: string,
    updateAttendanceDto: UpdateAttendanceDto,
  ): Promise<Attendance> {
    // 1. Find the existing record
    const record = await this.findOne(id);

    // 2. Set the clock-out time
    record.clockOut = new Date(updateAttendanceDto.clockOut);

    // 3. Calculate total hours
    const clockInTime = record.clockIn.getTime();
    const clockOutTime = record.clockOut.getTime();

    if (clockOutTime < clockInTime) {
      throw new Error('Clock-out time cannot be earlier than clock-in time');
    }

    const diffInMs = clockOutTime - clockInTime;
    const diffInHours = diffInMs / (1000 * 60 * 60);

    record.totalHours = parseFloat(diffInHours.toFixed(2));

    // 4. Save the updated record
    return this.attendanceRepository.save(record);
  }

  async remove(id: string): Promise<void> {
    const result = await this.attendanceRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(
        `Attendance record with ID "${id}" not found`,
      );
    }
  }
}
