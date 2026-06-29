export interface StaleJobEntry {
  entityId: string;
  entityType: 'BOOKING' | 'PAYMENT';
  status: string;
  stuckSinceHours: number;
}

const NON_TERMINAL_STATUSES = new Set(['PENDING', 'PROCESSING', 'ANALYZING']);

export function detectStaleJobs(
  entities: Array<{ id: string; type: string; status: string; updatedAt: Date }>,
  staleThresholdHours = 2,
  now?: Date,
): StaleJobEntry[] {
  const reference = now ?? new Date();
  const results: StaleJobEntry[] = [];

  for (const entity of entities) {
    if (!NON_TERMINAL_STATUSES.has(entity.status)) continue;

    const stuckSinceHours =
      (reference.getTime() - new Date(entity.updatedAt).getTime()) / (1000 * 60 * 60);

    if (stuckSinceHours >= staleThresholdHours) {
      results.push({
        entityId: entity.id,
        entityType: entity.type as 'BOOKING' | 'PAYMENT',
        status: entity.status,
        stuckSinceHours,
      });
    }
  }

  return results;
}
