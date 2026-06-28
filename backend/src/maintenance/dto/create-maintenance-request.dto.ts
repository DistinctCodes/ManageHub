import { IsEnum, IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { MaintenanceCategory } from '../enums/maintenance-category.enum';

export class CreateMaintenanceRequestDto {
  @IsOptional()
  @IsUUID()
  workspaceId?: string;

  @IsEnum(MaintenanceCategory)
  category: MaintenanceCategory;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;
}
