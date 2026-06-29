import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { ResourceType } from '../enums/resource-type.enum';

export class CreateResourceDto {
  @IsString() @IsNotEmpty() name: string;
  @IsString() @IsOptional() description?: string;
  @IsEnum(ResourceType) type: ResourceType;
  @IsInt() @Min(1) totalQuantity: number;
  @IsInt() @Min(0) @IsOptional() pricePerHour?: number;
  @IsOptional() images?: string[];
  @IsString() @IsOptional() locationId?: string;
}
