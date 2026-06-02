import { randomUUID } from 'crypto';

export interface AuditEntry {
  id: string;
  actorId: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

export function createAuditEntry(
  actor: { userId: string; role: string },
  action: string,
  resourceType: string,
  resourceId: string,
  metadata?: Record<string, unknown>,
): AuditEntry {
  return {
    id: randomUUID(),
    actorId: actor.userId,
    actorRole: actor.role,
    action,
    resourceType,
    resourceId,
    metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : {},
    timestamp: new Date().toISOString(),
  };
}
