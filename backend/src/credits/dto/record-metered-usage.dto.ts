import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { IsCurrencyCode } from '../../common/currency-code.decorator';
import { transformCurrencyCode } from '../../common/currency-code';
import { MinorUnits } from '../../payments/utils/minor-units.decorator';
import { MeteredResource } from '../enums/metered-resource.enum';

export class RecordMeteredUsageDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty({ enum: MeteredResource })
  @IsEnum(MeteredResource)
  resource: MeteredResource;

  @ApiProperty({
    description: 'Metered quantity — minutes, pages, ...',
    example: 12,
  })
  @MinorUnits()
  units: number;

  @ApiProperty({
    description: 'Price per unit in minor units',
    example: 5,
  })
  @MinorUnits()
  unitPrice: number;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @Transform(transformCurrencyCode)
  @IsString()
  @IsCurrencyCode()
  currency?: string;

  @ApiProperty({
    description:
      'Natural key for this usage event. A retried delivery of the same ' +
      'reading records once and charges once.',
    example: 'session-4711-minutes-12',
  })
  @IsString()
  @IsNotEmpty()
  usageReference: string;
}
