import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SupportTicketsService } from './support-tickets.service';
import { SupportTicketsController } from './support-tickets.controller';
import { SupportTicket } from './entities/support-ticket.entity';
import { Staff } from '../staff/entities/staff.entity'; // <-- Adjust path
import { User } from '../users/entities/user.entity'; // <-- Adjust path

// If you're using auth, you'll need to import AuthModule
// import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([SupportTicket, Staff, User]),
    // AuthModule, // <-- Import if @UseGuards is used
  ],
  controllers: [SupportTicketsController],
  providers: [SupportTicketsService],
})
export class SupportTicketsModule {}