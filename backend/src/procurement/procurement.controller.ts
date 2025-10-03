import { Body, Controller, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ProcurementService } from './providers/procurement.service';
import { CreateProcurementRequestDto } from './dto/create-procurement-request.dto';
import { GetCurrentUser } from '../auth/decorators/getCurrentUser.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/enums/userRoles.enum';

@Controller('procurements')
export class ProcurementController {
  constructor(private readonly procurementService: ProcurementService) {}

  @Post()
  async create(
    @Body() dto: CreateProcurementRequestDto,
    @GetCurrentUser('id') userId: string,
  ) {
    return await this.procurementService.createRequest(dto, userId);
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async approve(@Param('id') id: string) {
    return await this.procurementService.approveRequest(id);
  }

  @Patch(':id/reject')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async reject(@Param('id') id: string) {
    return await this.procurementService.rejectRequest(id);
  }
}