import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { CreateShiftDto } from './dto/create-shift.dto';
import { UpdateShiftDto } from './dto/update-shift.dto';
import { ShiftService } from './shifts.service';
import { ShiftStatus } from './entities/shift.entity';

@Controller('shifts')
export class ShiftController {
  constructor(private readonly shiftService: ShiftService) {}

  @Post()
  create(@Body() createShiftDto: CreateShiftDto) {
    return this.shiftService.create(createShiftDto);
  }

  @Get()
  findAll(
    @Query('staffId') staffId?: string,
    @Query('locationId') locationId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    if (staffId) {
      return this.shiftService.getShiftsByStaff(staffId);
    }

    if (locationId) {
      return this.shiftService.getShiftsByLocation(locationId);
    }

    if (startDate && endDate) {
      return this.shiftService.getShiftsByDateRange(startDate, endDate);
    }

    return this.shiftService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.shiftService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateShiftDto: UpdateShiftDto) {
    return this.shiftService.update(id, updateShiftDto);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body('status') status: ShiftStatus) {
    return this.shiftService.updateShiftStatus(id, status);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.shiftService.remove(id);
  }
}
