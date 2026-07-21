import {
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVisitorDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MaxLength(255)
  visitorName: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsOptional()
  @IsEmail()
  visitorEmail?: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  visitorPhone?: string;

  @ApiPropertyOptional({ example: 'Acme Corp' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  company?: string;

  @ApiPropertyOptional({ example: 'Partnership meeting' })
  @IsOptional()
  @IsString()
  purpose?: string;

  @ApiPropertyOptional({ example: '2026-07-20T10:00:00Z' })
  @IsOptional()
  @IsDateString()
  expectedArrival?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}