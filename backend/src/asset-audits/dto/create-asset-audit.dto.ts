import { IsUUID, IsDateString, IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateAssetAuditDto {
  @IsUUID()
  @IsNotEmpty()
  assetId: string;

  @IsDateString()
  @IsOptional()
  auditDate?: Date;

  @IsString()
  @IsNotEmpty()
  auditedBy: string;

  @IsString()
  @IsNotEmpty()
  status: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}
