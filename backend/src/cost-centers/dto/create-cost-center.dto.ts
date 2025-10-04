import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCostCenterDto {
  @ApiProperty({ example: 'Marketing Department' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    example: 'Handles all marketing-related expenses and assets',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}