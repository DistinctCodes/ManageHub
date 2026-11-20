import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { PaymentStatus } from '../enums/payment-status.enum';
import {
  PAYMENT_PAGE_DEFAULT_LIMIT,
  PAYMENT_PAGE_MAX_LIMIT,
} from '../payment-cursor.util';

export class ListPaymentsCursorQueryDto {
  @ApiPropertyOptional({
    description: `Page size (1-${PAYMENT_PAGE_MAX_LIMIT})`,
    default: PAYMENT_PAGE_DEFAULT_LIMIT,
    minimum: 1,
    maximum: PAYMENT_PAGE_MAX_LIMIT,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PAYMENT_PAGE_MAX_LIMIT)
  limit: number = PAYMENT_PAGE_DEFAULT_LIMIT;

  @ApiPropertyOptional({
    type: String,
    description: 'Opaque cursor from the previous page',
  })
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional({ enum: PaymentStatus })
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @ApiPropertyOptional({
    type: String,
    description: 'Inclusive ISO lower bound on createdAt',
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Inclusive ISO upper bound on createdAt',
  })
  @IsOptional()
  @IsDateString()
  to?: string;
}
