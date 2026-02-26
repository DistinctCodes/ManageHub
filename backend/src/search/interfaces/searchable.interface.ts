import { SearchResultDto } from '../dto/search-result.dto';

export type SearchQueryFn = (query: string, limit: number) => Promise<SearchResultDto[]>;

export interface Searchable {
  registerSearchable(type: string, queryFn: SearchQueryFn): void;
  getSearchableTypes(): string[];
}
