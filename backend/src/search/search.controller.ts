import { Controller, Get, Post, Query, Param, Body, BadRequestException } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchResultDto } from './dto/search-result.dto';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(@Query() query: SearchQueryDto): Promise<SearchResultDto[]> {
    return this.searchService.search(query);
  }

  @Get('types')
  getTypes() {
    return this.searchService.getSearchableTypes().map(type => ({
      type,
      enabled: this.searchService.isTypeEnabled(type)
    }));
  }

  @Post('types/:type/enable')
  enableType(@Param('type') type: string) {
    const success = this.searchService.enableType(type);
    if (!success) {
      throw new BadRequestException(`Type '${type}' not found`);
    }
    return { message: `Search for type '${type}' enabled` };
  }

  @Post('types/:type/disable')
  disableType(@Param('type') type: string) {
    const success = this.searchService.disableType(type);
    if (!success) {
      throw new BadRequestException(`Type '${type}' not found`);
    }
    return { message: `Search for type '${type}' disabled` };
  }
}
