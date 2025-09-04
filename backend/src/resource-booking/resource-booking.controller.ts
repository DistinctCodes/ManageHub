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

  @Get('bookings.ics')
  async exportICS(@Query('resourceId') resourceId: string, @Res() res: Response) {
    const ics = await this.service.exportICS(resourceId);
    res.setHeader('Content-Type', 'text/calendar');
    res.setHeader('Content-Disposition', 'attachment; filename="bookings.ics"');
    res.send(ics);
  }
}
