import {
  Body, Controller, Get, Param, ParseUUIDPipe,
  Patch, Post, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ParkingService } from './parking.service';
import { CreateParkingSpotDto } from './dto/create-parking-spot.dto';
import { UpdateParkingSpotDto } from './dto/update-parking-spot.dto';
import { AssignParkingSpotDto } from './dto/assign-parking-spot.dto';
import { GetCurrentUser } from '../auth/decorators/getCurrentUser.decorator';
import { Roles } from '../auth/decorators/roles.decorators';
import { RolesGuard } from '../auth/guard/roles.guard';
import { UserRole } from '../users/enums/userRoles.enum';

@ApiTags('Parking')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('parking')
export class ParkingController {
  constructor(private readonly parkingService: ParkingService) {}

  @Get()
  @Roles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'List parking spots. Admin sees all; member sees only their own.' })
  async findAll(
    @GetCurrentUser('id') userId: string,
    @GetCurrentUser('role') role: UserRole,
  ) {
    const isAdmin = role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN || role === UserRole.STAFF;
    const data = await this.parkingService.findAll(userId, isAdmin);
    return { message: 'Parking spots retrieved', data };
  }

  @Get('mine')
  @Roles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get the parking spot assigned to the current user (null if none)' })
  async findMine(@GetCurrentUser('id') userId: string) {
    const data = await this.parkingService.findMine(userId);
    return { message: 'Your parking spot', data };
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add a new parking spot (admin only)' })
  async create(@Body() dto: CreateParkingSpotDto) {
    const data = await this.parkingService.create(dto);
    return { message: 'Parking spot created', data };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update spot level, type, or notes (admin only)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateParkingSpotDto,
  ) {
    const data = await this.parkingService.update(id, dto);
    return { message: 'Parking spot updated', data };
  }

  @Post(':id/assign')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign spot to a member; notifies member in-app (admin only)' })
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignParkingSpotDto,
  ) {
    const data = await this.parkingService.assign(id, dto.userId);
    return { message: 'Parking spot assigned', data };
  }

  @Post(':id/unassign')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Release a spot; notifies affected member (admin only)' })
  async unassign(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.parkingService.unassign(id);
    return { message: 'Parking spot unassigned', data };
  }
}