import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  findAll() {
    return this.eventsService.findAll();
  }

  @Post(':id/rsvp')
  rsvp(@Param('id') id: string, @Body('userId') userId: string) {
    return this.eventsService.rsvp(id, userId);
  }
}
