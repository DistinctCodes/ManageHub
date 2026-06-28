import { Type } from 'class-transformer';
import { IsArray, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';

export class ZoneDto {
  @IsOptional()
  @IsUUID()
  workspaceId?: string;

  @IsNumber()
  x: number;

  @IsNumber()
  y: number;

  @IsNumber()
  width: number;

  @IsNumber()
  height: number;

  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  color?: string;
}

export class SaveZonesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ZoneDto)
  zones: ZoneDto[];
}
