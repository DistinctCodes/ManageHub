import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Length,
} from 'class-validator';
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
  @IsInt()
  @IsPositive()
  units: number;

  @ApiProperty({
    description: 'Price per unit in minor units',
    example: 5,
  })
  @IsInt()
  @IsPositive()
  unitPrice: number;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  @Length(3, 3)
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
