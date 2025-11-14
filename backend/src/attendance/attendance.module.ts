import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Attendance } from './entities/attendance.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Attendance])],
  controllers: [AttendanceController],
  providers: [AttendanceService],
})
export class AttendanceModule {}
