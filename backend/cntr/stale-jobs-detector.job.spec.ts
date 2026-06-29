import { detectStaleJobs, StaleJobEntry } from './stale-jobs-detector.job';

describe('detectStaleJobs', () => {
  const now = new Date('2024-01-01T12:00:00Z');

  function makeEntity(
    id: string,
    type: string,
    status: string,
    hoursAgo: number,
  ) {
    const updatedAt = new Date(now.getTime() - hoursAgo * 60 * 60 * 1000);
    return { id, type, status, updatedAt };
  }

  it('returns empty array when no entities', () => {
    expect(detectStaleJobs([], 2, now)).toEqual([]);
  });

  it('detects PENDING entity stuck beyond threshold', () => {
    const entity = makeEntity('1', 'BOOKING', 'PENDING', 3);
    const result = detectStaleJobs([entity], 2, now);
    expect(result).toHaveLength(1);
    expect(result[0].entityId).toBe('1');
    expect(result[0].status).toBe('PENDING');
    expect(result[0].stuckSinceHours).toBeCloseTo(3);
  });

  it('detects PROCESSING entity', () => {
    const entity = makeEntity('2', 'PAYMENT', 'PROCESSING', 5);
    const result = detectStaleJobs([entity], 2, now);
    expect(result[0].entityType).toBe('PAYMENT');
  });

  it('detects ANALYZING entity', () => {
    const entity = makeEntity('3', 'BOOKING', 'ANALYZING', 2);
    const result = detectStaleJobs([entity], 2, now);
    expect(result).toHaveLength(1);
  });

  it('does not return entity below threshold', () => {
    const entity = makeEntity('4', 'BOOKING', 'PENDING', 1);
    expect(detectStaleJobs([entity], 2, now)).toHaveLength(0);
  });

  it('does not return COMPLETED entities', () => {
    const entity = makeEntity('5', 'BOOKING', 'COMPLETED', 10);
    expect(detectStaleJobs([entity], 2, now)).toHaveLength(0);
  });

  it('does not return CANCELLED entities', () => {
    const entity = makeEntity('6', 'PAYMENT', 'CANCELLED', 10);
    expect(detectStaleJobs([entity], 2, now)).toHaveLength(0);
  });

  it('uses current time when now not provided', () => {
    const entity = makeEntity('7', 'BOOKING', 'PENDING', 0);
    // entity just updated — should not be stale
    entity.updatedAt = new Date();
    expect(detectStaleJobs([entity])).toHaveLength(0);
  });

  it('handles custom threshold', () => {
    const entity = makeEntity('8', 'BOOKING', 'PENDING', 1);
    expect(detectStaleJobs([entity], 0.5, now)).toHaveLength(1);
  });

  it('returns multiple stale entries', () => {
    const entities = [
      makeEntity('a', 'BOOKING', 'PENDING', 3),
      makeEntity('b', 'PAYMENT', 'PROCESSING', 4),
      makeEntity('c', 'BOOKING', 'COMPLETED', 10),
    ];
    const result = detectStaleJobs(entities, 2, now);
    expect(result).toHaveLength(2);
    const ids = result.map((r: StaleJobEntry) => r.entityId);
    expect(ids).toContain('a');
    expect(ids).toContain('b');
  });
});
