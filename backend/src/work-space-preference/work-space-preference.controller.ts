import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WorkspacePreferencesService } from './work-space-preference.service';
import { CreateWorkspacePreferenceDto } from './dto/create-work-space-preference.dto';
import { WorkspacePreferenceQueryDto } from './dto/work-space-preference-query.dto';
import { PreferenceType } from './entities/work-space-preference.entity';
import { UpdateWorkspacePreferenceDto } from './dto/update-work-space-preference.dto';

@Controller('workspace-preferences')
export class WorkspacePreferencesController {
  constructor(
    private readonly workspacePreferencesService: WorkspacePreferencesService,
  ) {}

  @Post()
  create(@Body() createDto: CreateWorkspacePreferenceDto) {
    return this.workspacePreferencesService.create(createDto);
  }

  @Get()
  findAll(@Query() query: WorkspacePreferenceQueryDto) {
    return this.workspacePreferencesService.findAll(query);
  }

  @Get('users/:userId')
  findByUserId(@Param('userId') userId: string) {
    return this.workspacePreferencesService.findByUserId(userId);
  }

  @Get('users/:userId/profile')
  getUserPreferencesProfile(@Param('userId') userId: string) {
    return this.workspacePreferencesService.getUserPreferencesProfile(userId);
  }

  @Get('users/:userId/:preferenceType')
  findUserPreference(
    @Param('userId') userId: string,
    @Param('preferenceType') preferenceType: PreferenceType,
  ) {
    return this.workspacePreferencesService.findUserPreference(
      userId,
      preferenceType,
    );
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.workspacePreferencesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateWorkspacePreferenceDto,
  ) {
    return this.workspacePreferencesService.update(id, updateDto);
  }

  @Patch('users/:userId/:preferenceType')
  updateUserPreference(
    @Param('userId') userId: string,
    @Param('preferenceType') preferenceType: PreferenceType,
    @Body() updateDto: UpdateWorkspacePreferenceDto,
  ) {
    return this.workspacePreferencesService.updateUserPreference(
      userId,
      preferenceType,
      updateDto,
    );
  }

  @Post('users/:userId/bulk')
  @HttpCode(HttpStatus.OK)
  bulkUpdateUserPreferences(
    @Param('userId') userId: string,
    @Body()
    preferences: Array<{
      preferenceType: PreferenceType;
      value: any;
      unit?: string;
      description?: string;
    }>,
  ) {
    return this.workspacePreferencesService.bulkUpdateUserPreferences(
      userId,
      preferences,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.workspacePreferencesService.remove(id);
  }

  @Delete('users/:userId/:preferenceType')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeUserPreference(
    @Param('userId') userId: string,
    @Param('preferenceType') preferenceType: PreferenceType,
  ) {
    return this.workspacePreferencesService.removeUserPreference(
      userId,
      preferenceType,
    );
  }
}
