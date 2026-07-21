import { IsString, IsInt, IsOptional, IsBoolean, IsArray, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateResourceDto {
  @ApiProperty({ example: 'Projector' })
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ default: 0, description: 'Price per session in kobo (0 = free)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  priceKoboPerSession?: number;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({ example: ['MEETING_ROOM'], nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  applicableWorkspaceTypes?: string[] | null;
}