import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { VisitorsService } from './visitors.service';
import { CreateVisitorDto } from './dto/create-visitor.dto';
import { VisitorQueryDto } from './dto/visitor-query.dto';
import { GetCurrentUser } from '../auth/decorators/getCurrentUser.decorator';
import { Roles } from '../auth/decorators/roles.decorators';
import { RolesGuard } from '../auth/guard/roles.guard';
import { UserRole } from '../users/enums/userRoles.enum';

@ApiTags('Visitors')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller('visitors')
export class VisitorsController {
  constructor(private readonly visitorsService: VisitorsService) {}

  /** POST /visitors — host pre-registers a visitor */
  @Post()
  @Roles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Pre-register an expected visitor' })
  async create(
    @Body() dto: CreateVisitorDto,
    @GetCurrentUser('id') userId: string,
  ) {
    const data = await this.visitorsService.create(userId, dto);
    return { message: 'Visitor registered successfully', data };
  }

  /** GET /visitors/mine — authenticated member's own visitors */
  @Get('mine')
  @Roles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get my visitors (paginated)' })
  async findMine(
    @GetCurrentUser('id') userId: string,
    @Query() query: VisitorQueryDto,
  ) {
    const result = await this.visitorsService.findMine(userId, query);
    return { message: 'Visitors retrieved', ...result };
  }

  /** GET /visitors — admin/staff view all visitors */
  @Get()
  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all visitors — admin/staff only (filterable)' })
  async findAll(@Query() query: VisitorQueryDto) {
    const result = await this.visitorsService.findAll(query);
    return { message: 'All visitors retrieved', ...result };
  }

  /** POST /visitors/:id/check-in — staff marks visitor as arrived */
  @Post(':id/check-in')
  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check in a visitor (staff only)' })
  async checkIn(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.visitorsService.checkIn(id);
    return { message: 'Visitor checked in', data };
  }

  /** POST /visitors/:id/check-out — staff marks visitor departure */
  @Post(':id/check-out')
  @Roles(UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check out a visitor (staff only)' })
  async checkOut(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.visitorsService.checkOut(id);
    return { message: 'Visitor checked out', data };
  }

  /** PATCH /visitors/:id/cancel — host cancels expected visit */
  @Patch(':id/cancel')
  @Roles(UserRole.USER, UserRole.STAFF, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel an expected visitor (host only)' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @GetCurrentUser('id') userId: string,
  ) {
    const data = await this.visitorsService.cancel(id, userId);
    return { message: 'Visitor cancelled', data };
  }
}