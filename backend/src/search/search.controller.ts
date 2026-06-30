import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/guard/jwt.auth.guard';
import { Request } from 'express';

@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(
    @Query('q') query: string,
    @Query('types') types: string,
    @Req() req: Request,
  ) {
    return this.searchService.search(query, types, req.user);
  }
}