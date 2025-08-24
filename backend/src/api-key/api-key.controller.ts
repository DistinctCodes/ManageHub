import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import { ApiKeyService } from './api-key.service';

@Controller('api-keys')
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  create(@Body() createDto: CreateApiKeyDto) {
    return this.apiKeyService.createApiKey(createDto);
  }

  @Get()
  findAll() {
    return this.apiKeyService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.apiKeyService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateApiKeyDto,
  ) {
    return this.apiKeyService.update(id, updateDto);
  }

  @Delete(':id/revoke')
  revoke(@Param('id', ParseUUIDPipe) id: string) {
    return this.apiKeyService.revokeApiKey(id);
  }

  @Get(':id/usage')
  getUsageStats(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('days', new ParseIntPipe({ optional: true })) days?: number,
  ) {
    return this.apiKeyService.getUsageStats(id, days);
  }
}
