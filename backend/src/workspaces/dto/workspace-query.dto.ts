import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { WorkspaceType } from '../enums/workspace-type.enum';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class WorkspaceQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiPropertyOptional({ enum: WorkspaceType })
  @IsOptional()
  @IsEnum(WorkspaceType)
  type?: WorkspaceType;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minSeats?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
