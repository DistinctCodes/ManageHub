import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Max, Min } from 'class-validator';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '../payments-admin-pagination.util';

/**
 * Offset pagination for `GET /payments/admin/manual-review` (issue #1944).
 * Bounds the manual-review queue response so a provider outage that floods
 * the queue can't produce an unbounded, unusable payload. Defaults and
 * maximums are shared with `payments-admin-pagination.util.ts`.
 */
export class ListManualReviewQueryDto {
  @ApiPropertyOptional({
    description: 'Page size (1–100)',
    default: DEFAULT_PAGE_SIZE,
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  limit: number = DEFAULT_PAGE_SIZE;

  @ApiPropertyOptional({
    description: 'Rows to skip from the start of the oldest-first queue',
    default: 0,
    minimum: 0,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset: number = 0;
}
