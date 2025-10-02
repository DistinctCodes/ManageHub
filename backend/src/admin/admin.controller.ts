import { Controller, Patch, Delete, Param, Body, ParseUUIDPipe, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { UsersService } from '../users/providers/users.service';
import { UpdateUserDto } from '../users/dto/updateUser.dto';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/enums/userRoles.enum';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(RolesGuard)
export class AdminController {
  constructor(private readonly usersService: UsersService) {}

  // PATCH /admin/:id
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async updateAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateData: UpdateUserDto,
  ) {
    const admin = await this.usersService.updateUser(id, { ...updateData, role: UserRole.ADMIN });
    return {
      success: true,
      message: `Admin ${id} updated successfully`,
      data: admin,
    };
  }

  // DELETE /admin/:id
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAdmin(@Param('id', ParseUUIDPipe) id: string) {
    await this.usersService.deleteUser(id);
    return;
  }
}
