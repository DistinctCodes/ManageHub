import {
  IsEnum,
  IsInt,
  IsOptional,
  IsDateString,
  IsArray,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateBookingDto } from './create-booking.dto';
import { RecurringFrequency } from '../entities/recurring-rule.entity';

export class RecurringRuleDto {
  @ApiProperty({ enum: RecurringFrequency })
  @IsEnum(RecurringFrequency)
  frequency: RecurringFrequency;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  interval: number;

  @ApiPropertyOptional({ example: [1, 3], description: '0=Sun … 6=Sat' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek?: number[];

  @ApiPropertyOptional({ example: '2026-12-31' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(52)
  maxOccurrences?: number;
}

export class CreateRecurringBookingDto extends CreateBookingDto {
  @ApiProperty({ type: RecurringRuleDto })
  @ValidateNested()
  @Type(() => RecurringRuleDto)
  recurringRule: RecurringRuleDto;
}
