export type ResourceType = 'PRINT' | 'INTERNET' | 'LOCKER';

export interface ResourceUsageLog {
  sessionId: string;
  memberId: string;
  resourceType: ResourceType;
  quantity: number;
  unit: string;
  recordedAt: string;
}

export function createUsageLog(
  sessionId: string,
  memberId: string,
  resourceType: ResourceType,
  quantity: number,
  unit: string,
): ResourceUsageLog {
  if (quantity <= 0) {
    throw new RangeError(`quantity must be > 0, got: ${quantity}`);
  }
  return {
    sessionId,
    memberId,
    resourceType,
    quantity,
    unit,
    recordedAt: new Date().toISOString(),
  };
}
