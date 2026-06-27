import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { Event } from './entities/event.entity';
import { EventRegistration } from './entities/event-registration.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Event, EventRegistration]), AuthModule],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}