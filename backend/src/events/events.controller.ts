import { Controller, Post, Body, UseGuards, Get, Param, Patch, Delete, Query } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { JwtAuthGuard } from '../auth/guard/jwt.auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from '../auth/common/enum/user-role-enum';
import { CurrentUser } from '../auth/decorators/current.user.decorators';
import { Public } from '../auth/decorators/public.decorator';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(@Body() createEventDto: CreateEventDto, @CurrentUser() user) {
    return this.eventsService.create(createEventDto, user.id);
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  getMyRegistrations(@CurrentUser() user) {
    return this.eventsService.getMyRegistrations(user.id);
  }

  @Get()
  @Public()
  findAll(@CurrentUser() user) {
    const isPublic = !user || user.role !== UserRole.ADMIN;
    return this.eventsService.findAll(isPublic);
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() updateEventDto: UpdateEventDto) {
    return this.eventsService.update(id, updateEventDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  remove(@Param('id') id: string) {
    return this.eventsService.remove(id);
  }

  @Post(':id/register')
  @UseGuards(JwtAuthGuard)
  register(@Param('id') id: string, @CurrentUser() user) {
    return this.eventsService.register(id, user.id);
  }

  @Delete(':id/register')
  @UseGuards(JwtAuthGuard)
  cancelRegistration(@Param('id') id: string, @CurrentUser() user) {
    return this.eventsService.cancelRegistration(id, user.id);
  }

  @Get(':id/registrations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getRegistrations(@Param('id') id: string) {
    return this.eventsService.getRegistrations(id);
  }
}