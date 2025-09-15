import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './entities/event.entity';
import { EventRsvp } from './entities/event-rsvp.entity';
import { EventRsvpController } from './event-rsvp.controller';
import { EventService } from './services/event.service';
import { RsvpService } from './services/rsvp.service';

@Module({
  imports: [TypeOrmModule.forFeature([Event, EventRsvp])],
  controllers: [EventRsvpController],
  providers: [EventService, RsvpService],
  exports: [EventService, RsvpService],
})
export class EventRsvpModule {}