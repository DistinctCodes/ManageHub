import { Controller, Patch, Delete, Param, Body, ParseUUIDPipe, HttpCode, HttpStatus, UseGuards, Get } from '@nestjs/common';
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

  // GET /admin
  @Get()
  @Roles(UserRole.ADMIN)
  async getAdmins() {
    const admins = await this.usersService.findAllAdmins();
    return {
      success: true,
      message: 'Admins retrieved successfully',
      data: admins,
    };
  }

  // GET /admin/:id
  @Get(':id')
  @Roles(UserRole.ADMIN)
  async getAdmin(@Param('id', ParseUUIDPipe) id: string) {
    const admin = await this.usersService.findAdminById(id);
    return {
      success: true,
      message: `Admin ${id} retrieved successfully`,
      data: admin,
    };
  }

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
