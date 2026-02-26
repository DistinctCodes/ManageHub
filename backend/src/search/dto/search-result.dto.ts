export class SearchResultDto {
  type: string;
  id: string;
  title: string;
  description: string;
  url: string;
  score: number;

  constructor(partial: Partial<SearchResultDto>) {
    Object.assign(this, partial);
  }
}
