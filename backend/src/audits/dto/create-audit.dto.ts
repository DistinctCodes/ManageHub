import { IsEnum, IsOptional, IsString, IsObject, IsUUID } from 'class-validator';
import { AuditAction, AuditStatus } from '../entities/audit.entity';

export class CreateAuditDto {
  @IsEnum(AuditAction)
  action: AuditAction;

  @IsString()
  entityType: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsEnum(AuditStatus)
  status?: AuditStatus;

  @IsOptional()
  @IsString()
  details?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}