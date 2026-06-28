import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from '../bookings/entities/booking.entity';
import { Invoice } from '../invoices/entities/invoice.entity';
import { User } from '../users/entities/user.entity';
import { Workspace } from '../workspaces/entities/workspace.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, Invoice, User, Workspace])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
