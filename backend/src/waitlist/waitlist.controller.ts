import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { WaitlistService } from './waitlist.service';
import { CreateWaitlistDto } from './dto/create-waitlist.dto';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { GetCurrentUser } from '../auth/decorators/getCurrentUser.decorator';
import { UserRole } from '../users/enums/userRoles.enum';
import { User } from '../users/entities/user.entity';

@Controller('waitlist')
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  @Post()
  join(@GetCurrentUser() user: User, @Body() dto: CreateWaitlistDto) {
    return this.waitlistService.join(dto.workspaceId, user.id, dto);
  }

  @Get('my')
  getMyEntries(@GetCurrentUser() user: User) {
    return this.waitlistService.getMyEntries(user.id);
  }

  @Delete(':id')
  leave(
    @Param('id', ParseUUIDPipe) id: string,
    @GetCurrentUser() user: User,
  ) {
    return this.waitlistService.leave(id, user.id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAll() {
    return this.waitlistService.findAll();
  }
}