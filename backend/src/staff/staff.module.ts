import { Module } from '@nestjs/common';
import { StaffService } from './staff.service';
import { StaffController } from './staff.controller';

@Module({
  controllers: [StaffController],
  providers: [StaffService],
})
export class StaffModule {}
