import { SetMetadata } from '@nestjs/common';
import { AuditAction } from '../entities/audit.entity';

export const AUDIT_KEY = 'audit';

export interface AuditMetadata {
  action: AuditAction;
  entityType: string;
}

export const AuditLog = (action: AuditAction, entityType: string) =>
  SetMetadata(AUDIT_KEY, { action, entityType });