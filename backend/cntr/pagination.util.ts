import { IsInt, IsOptional, Max, Min } from 'class-validator';

/**
 * Pagination request DTO with configurable page and limit.
 */
export class PaginationDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}

/**
 * Generic paginated response interface.
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Paginates an array based on the provided DTO.
 * Returns an empty data array if the page exceeds the total pages.
 *
 * @param items - The array to paginate
 * @param dto - The pagination request DTO containing page and limit
 * @returns A PaginatedResult with the sliced data and pagination metadata
 */
export function paginateArray<T>(
  items: T[],
  dto: PaginationDto,
): PaginatedResult<T> {
  const total = items.length;
  const page = Math.max(1, dto.page || 1);
  const limit = Math.max(1, Math.min(dto.limit || 20, 100));
  const totalPages = Math.ceil(total / limit);

  // Calculate start and end indices
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;

  // Slice the array; if page exceeds total pages, data will be empty
  const data = startIndex < total ? items.slice(startIndex, endIndex) : [];

  return {
    data,
    total,
    page,
    limit,
    totalPages,
  };
}
