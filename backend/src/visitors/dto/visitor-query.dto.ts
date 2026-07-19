import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../config/pagination/dto/pagination-query.dto';
import { VisitorStatus } from '../enums/visitor-status.enum';

export class VisitorQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: VisitorStatus })
  @IsOptional()
  @IsEnum(VisitorStatus)
  status?: VisitorStatus;

  @ApiPropertyOptional({ example: '2026-07-01' })
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-07-31' })
  @IsOptional()
  @IsDateString()
  dateTo?: string;
}