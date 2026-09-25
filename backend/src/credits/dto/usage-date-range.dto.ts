import { IsDateString, IsOptional } from 'class-validator';

// DTO for credits.controller.ts's usage-by-date-range query, with sane
// bounds so callers can't pass start > end or an unbounded multi-year range.
export class UsageDateRangeDto {
  @IsOptional()
  @IsDateString()
  start?: string;

  @IsOptional()
  @IsDateString()
  end?: string;
}

const MAX_RANGE_DAYS = 366;

export function validateUsageDateRange(dto: UsageDateRangeDto): void {
  if (!dto.start || !dto.end) return;

  const start = new Date(dto.start);
  const end = new Date(dto.end);

  if (start > end) {
    throw new Error('start date must not be after end date');
  }

  const rangeDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  if (rangeDays > MAX_RANGE_DAYS) {
    throw new Error(`date range must not exceed ${MAX_RANGE_DAYS} days`);
  }
}
