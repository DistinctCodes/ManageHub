import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from '../users/enums/userRoles.enum';
import { GetCurrentUser } from '../auth/decorators/getCurrentUser.decorator';

@ApiTags('events')
@ApiBearerAuth()
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an event (Admin only)' })
  async create(@Body() dto: CreateEventDto) {
    const event = await this.eventsService.create(dto);
    return { message: 'Event created successfully', data: event };
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update an event (Admin only)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateEventDto,
  ) {
    const event = await this.eventsService.update(id, dto);
    return { message: 'Event updated successfully', data: event };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an event (Admin only, soft delete)' })
  async cancel(@Param('id', ParseUUIDPipe) id: string) {
    const event = await this.eventsService.cancel(id);
    return { message: 'Event cancelled successfully', data: event };
  }

  @Get()
  @ApiOperation({ summary: 'List upcoming non-cancelled events' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.eventsService.findAll(
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
    return { message: 'Events retrieved successfully', ...result };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event details with RSVP count' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const event = await this.eventsService.findById(id);
    return { message: 'Event retrieved successfully', data: event };
  }

  @Post(':id/rsvp')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'RSVP to an event' })
  async rsvp(
    @Param('id', ParseUUIDPipe) id: string,
    @GetCurrentUser('id') userId: string,
  ) {
    const rsvp = await this.eventsService.rsvp(id, userId);
    return { message: 'RSVP confirmed', data: rsvp };
  }

  @Delete(':id/rsvp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel your RSVP' })
  async cancelRsvp(
    @Param('id', ParseUUIDPipe) id: string,
    @GetCurrentUser('id') userId: string,
  ) {
    await this.eventsService.cancelRsvp(id, userId);
    return { message: 'RSVP cancelled' };
  }

  @Get(':id/attendees')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List event attendees (Admin only)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async findAttendees(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.eventsService.findAttendees(
      id,
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
    return { message: 'Attendees retrieved successfully', ...result };
  }
}
