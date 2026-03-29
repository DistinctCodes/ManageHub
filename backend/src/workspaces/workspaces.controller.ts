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
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { WorkspaceQueryDto } from './dto/workspace-query.dto';
import { RolesGuard } from '../auth/guard/roles.guard';
import { Roles } from '../auth/decorators/roles.decorators';
import { UserRole } from '../users/enums/userRoles.enum';
import { Public } from '../auth/decorators/public.decorator';
import { GetCurrentUser } from '../auth/decorators/getCurrentUser.decorator';

@ApiTags('workspaces')
@ApiBearerAuth()
@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a new workspace (Admin only)' })
  async create(@Body() dto: CreateWorkspaceDto) {
    const workspace = await this.workspacesService.create(dto);
    return { message: 'Workspace created successfully', data: workspace };
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'List all active workspaces' })
  async findAll(@Query() query: WorkspaceQueryDto) {
    const result = await this.workspacesService.findAll(query);
    return { message: 'Workspaces retrieved successfully', ...result };
  }

  @Get('admin/all')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'List all workspaces including inactive (Admin)' })
  async findAllAdmin(@Query() query: WorkspaceQueryDto) {
    const result = await this.workspacesService.findAll(query, true);
    return { message: 'Workspaces retrieved successfully', ...result };
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get workspace by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    const workspace = await this.workspacesService.findById(id);
    return { message: 'Workspace retrieved successfully', data: workspace };
  }

  @Get(':id/availability')
  @Public()
  @ApiOperation({ summary: 'Check workspace seat availability' })
  @ApiQuery({ name: 'seats', required: false, type: Number })
  async checkAvailability(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('seats') seats?: number,
  ) {
    const result = await this.workspacesService.checkAvailability(
      id,
      seats ? Number(seats) : 1,
    );
    return { message: 'Availability checked', data: result };
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.STAFF)
  @ApiOperation({ summary: 'Update workspace (Admin/Staff)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    const workspace = await this.workspacesService.update(id, dto);
    return { message: 'Workspace updated successfully', data: workspace };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate workspace (Admin only)' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.workspacesService.softDelete(id);
    return { message: 'Workspace deactivated successfully' };
  }
}
