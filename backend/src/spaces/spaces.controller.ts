import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from "@nestjs/common"
import type { SpacesService } from "./spaces.service"
import type { CreateWorkspaceDto } from "./dto/create-workspace.dto"
import type { UpdateWorkspaceStatusDto } from "./dto/update-workspace-status.dto"
import type { FilterWorkspaceDto } from "./dto/filter-workspace.dto"
import type { Workspace } from "./entities/workspace.entity"

@Controller("spaces")
export class SpacesController {
  constructor(private readonly spacesService: SpacesService) {}

  @Post()
  create(@Body() createWorkspaceDto: CreateWorkspaceDto): Promise<Workspace> {
    return this.spacesService.create(createWorkspaceDto);
  }

  @Get()
  findAll(@Query() filterDto: FilterWorkspaceDto): Promise<Workspace[]> {
    return this.spacesService.findAll(filterDto);
  }

  @Patch(":id/status")
  updateStatus(@Param('id') id: string, @Body() updateStatusDto: UpdateWorkspaceStatusDto): Promise<Workspace> {
    return this.spacesService.updateStatus(id, updateStatusDto)
  }

  // Additional endpoints for future expansion
  @Get(':id')
  findOne(@Param('id') id: string): Promise<Workspace> {
    return this.spacesService.findOne(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.spacesService.remove(id);
  }
}
