import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ParkingService } from './parking.service';
import { CreateSlotDto } from './dto/create-slot.dto';
import { ReserveSlotDto } from './dto/reserve-slot.dto';
import { ReleaseSlotDto } from './dto/release-slot.dto';

@Controller('parking')
export class ParkingController {
  constructor(private readonly service: ParkingService) {}

  @Post('slots')
  createSlot(@Body() dto: CreateSlotDto) {
    return this.service.createSlot(dto);
  }

  @Get('slots')
  listSlots() {
    return this.service.listSlots();
  }

  @Post('reserve')
  reserve(@Body() dto: ReserveSlotDto) {
    return this.service.reserve(dto);
  }

  @Post('release')
  release(@Body() dto: ReleaseSlotDto) {
    return this.service.release(dto);
  }

  @Get('bookings')
  listBookings(@Query('slotId') slotId?: string, @Query('staffId') staffId?: string) {
    return this.service.listBookings({ slotId, staffId });
  }
}
