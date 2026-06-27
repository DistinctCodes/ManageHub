import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { VisitorsService } from './visitors.service';
import { CreateVisitorDto } from './dto/create-visitor.dto';
import { VisitorQueryDto } from './dto/visitor-query.dto';
import { JwtAuthGuard } from '../auth/guard/jwt.auth.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from '../auth/common/enum/user-role-enum';
import { CurrentUser } from '../auth/decorators/current.user.decorators';
import { User } from '../users/entities/user.entity';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('visitors')
export class VisitorsController {
  constructor(private readonly visitorsService: VisitorsService) {}

  @Post()
  create(
    @Body() createVisitorDto: CreateVisitorDto,
    @CurrentUser() user: User,
  ) {
    return this.visitorsService.create(createVisitorDto, user);
  }

  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Get()
  findAll(@Query() queryDto: VisitorQueryDto) {
    return this.visitorsService.findAll(queryDto);
  }

  @Get('/my')
  findMy(@CurrentUser() user: User, @Query() queryDto: VisitorQueryDto) {
    return this.visitorsService.findMy(user.id, queryDto);
  }

  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Patch(':id/check-in')
  checkIn(@Param('id', ParseUUIDPipe) id: string) {
    return this.visitorsService.checkIn(id);
  }

  @Roles(UserRole.ADMIN, UserRole.STAFF)
  @Patch(':id/check-out')
  checkOut(@Param('id', ParseUUIDPipe) id: string) {
    return this.visitorsService.checkOut(id);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: User) {
    return this.visitorsService.remove(id, user);
  }
}
