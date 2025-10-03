import { IsEnum } from 'class-validator';
import { ProcurementStatus } from '../enums/procurement-status.enum';

export class UpdateProcurementStatusDto {
  @IsEnum(ProcurementStatus)
  status: ProcurementStatus;
}