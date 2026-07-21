import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer' })
  @Min(1, { message: 'Page must be greater than or equal to 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'perPage must be an integer' })
  @Min(10, { message: 'Page must be greater than or equal to 1' })
  @Max(100, { message: 'perPage must be less than or equal to 100' })
  perPage?: number = 10;

  @IsOptional()
  @Type(() => String)
  category?: string;

  @IsOptional()
  @Type(() => String)
  searchTerm?: string;
}
