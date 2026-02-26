import { Injectable, Logger } from '@nestjs/common';
import { SearchQueryDto } from './dto/search-query.dto';
import { SearchResultDto } from './dto/search-result.dto';
import { SearchQueryFn } from './interfaces/searchable.interface';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private searchables: Map<string, SearchQueryFn> = new Map();
  private disabledTypes: Set<string> = new Set();

  registerSearchable(type: string, queryFn: SearchQueryFn) {
    this.logger.log(`Registering searchable type: ${type}`);
    this.searchables.set(type, queryFn);
  }

  getSearchableTypes(): string[] {
    return Array.from(this.searchables.keys());
  }

  enableType(type: string) {
    if (this.searchables.has(type)) {
      this.disabledTypes.delete(type);
      this.logger.log(`Enabled search for type: ${type}`);
      return true;
    }
    return false;
  }

  disableType(type: string) {
    if (this.searchables.has(type)) {
      this.disabledTypes.add(type);
      this.logger.log(`Disabled search for type: ${type}`);
      return true;
    }
    return false;
  }

  isTypeEnabled(type: string): boolean {
    return this.searchables.has(type) && !this.disabledTypes.has(type);
  }

  async search(queryDto: SearchQueryDto): Promise<SearchResultDto[]> {
    const { q, types, page = 1, limit = 10 } = queryDto;
    const query = q.trim();

    if (!query) {
      return [];
    }

    // Determine which types to search
    const availableTypes = Array.from(this.searchables.keys());
    let typesToSearch = availableTypes;

    if (types && types.length > 0) {
      // Filter requested types to ensure they are registered
      typesToSearch = types.filter(t => this.searchables.has(t));
    }

    // Filter out disabled types
    typesToSearch = typesToSearch.filter(t => !this.disabledTypes.has(t));

    if (typesToSearch.length === 0) {
      return [];
    }

    this.logger.log(`Searching for '${query}' in types: ${typesToSearch.join(', ')}`);

    // We fetch (page * limit) items from each provider to ensure we have enough candidates for merging
    // This is a heuristic; for perfect pagination, we'd need a more complex strategy.
    const fetchLimit = page * limit;

    const promises = typesToSearch.map(async (type) => {
      const fn = this.searchables.get(type);
      try {
        return await fn(query, fetchLimit);
      } catch (error) {
        this.logger.error(`Error searching type ${type}: ${error.message}`);
        return [];
      }
    });

    const results = await Promise.all(promises);
    const flatResults = results.flat();

    // Sort by score descending
    flatResults.sort((a, b) => b.score - a.score);

    // Apply pagination to the merged results
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    return flatResults.slice(startIndex, endIndex);
  }
}
