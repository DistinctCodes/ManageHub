import { IsOptional, IsDateString, IsEnum, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../config/pagination/dto/pagination-query.dto';
import { VisitorStatus } from '../enums/visitor-status.enum';

export class VisitorQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsEnum(VisitorStatus)
  status?: VisitorStatus;

  @IsOptional()
  @IsUUID()
  hostMemberId?: string;
}
