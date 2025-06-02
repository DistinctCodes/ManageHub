import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../roles/role.enum';
import { RolesGuard } from '../common/guards/roles.guards';

@Controller('workspaces')
@UseGuards(RolesGuard)
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post()
  @Roles(Role.Admin, Role.HubManager)
  async create(@Body() dto: CreateWorkspaceDto) {
    return this.workspaceService.createWorkspace(dto);
  }
}
