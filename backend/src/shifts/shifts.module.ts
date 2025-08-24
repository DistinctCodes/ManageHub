import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Staff } from 'src/staff/entities/staff.entity';
import { Shift } from './entities/shift.entity';
import { ShiftController } from './shifts.controller';
import { ShiftService } from './shifts.service';
@Module({
  imports: [TypeOrmModule.forFeature([Shift, Staff, Location])],
  controllers: [ShiftController],
  providers: [ShiftService],
  exports: [ShiftService],
})
export class ShiftModule {}
