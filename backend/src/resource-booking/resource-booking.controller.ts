import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { ResourceBookingService } from './resource-booking.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { CreateBookingDto } from './dto/create-booking.dto';

@Controller('resource-booking')
export class ResourceBookingController {
  constructor(private readonly service: ResourceBookingService) {}

  @Post('resource')
  createResource(@Body() dto: CreateResourceDto) {
    return this.service.createResource(dto);
  }

  @Get('resources')
  listResources() {
    return this.service.listResources();
  }

  @Post('booking')
  createBooking(@Body() dto: CreateBookingDto) {
    return this.service.createBooking(dto);
  }

  @Get('bookings')
  listBookings(@Query('resourceId') resourceId?: string) {
    return this.service.listBookings(resourceId);
  }
}
