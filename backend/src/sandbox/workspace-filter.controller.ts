import {
  Controller,
  Get,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { WorkspaceFilterService } from './workspace-filter.service';

@Controller('sandbox/workspaces')
export class WorkspaceFilterController {
  constructor(
    private readonly workspaceFilterService: WorkspaceFilterService,
  ) {}

  /**
   * GET /sandbox/workspaces?amenities=wifi,standing-desk&page=1&limit=10
   * Filters workspaces by amenities (AND logic, case-insensitive).
   */
  @Get()
  filterWorkspaces(
    @Query('amenities') amenities: string | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.workspaceFilterService.filterByAmenities(
      amenities,
      page,
      limit,
    );
  }
}
