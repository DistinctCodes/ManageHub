import { IsEnum } from 'class-validator';
import { MaintenanceStatus } from '../enums/maintenance-status.enum';

export class UpdateMaintenanceStatusDto {
  @IsEnum(MaintenanceStatus)
  status: MaintenanceStatus;
}
