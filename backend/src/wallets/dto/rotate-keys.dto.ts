import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';

export class RotateKeysDto {
  @ApiProperty({
    description: 'kmsKeyId the rows currently reference (the old KEK)',
    example: 'local-master-key-v1',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 128)
  fromKeyId: string;

  @ApiProperty({
    description: 'kmsKeyId to re-wrap the data keys under (the new KEK)',
    example: 'local-master-key-v2',
  })
  @IsString()
  @IsNotEmpty()
  @Length(1, 128)
  toKeyId: string;

  @ApiPropertyOptional({
    description: 'Rows re-wrapped per batch (defaults to config, max 10000)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000)
  batchSize?: number;

  @ApiPropertyOptional({
    description:
      'Stop after this many batches (defaults to draining everything). ' +
      'Set a small value to process a resumable slice per call.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxBatches?: number;
}
