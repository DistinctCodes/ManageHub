import { ReconciliationRunResponseDto } from './reconciliation-run-response.dto';

describe('ReconciliationRunResponseDto', () => {
  it('maps a persisted reconciliation run without exposing entity-only state', () => {
    const run = {
      id: 'run-1',
      startedAt: new Date('2025-01-01T00:00:00.000Z'),
      finishedAt: new Date('2025-01-01T00:00:01.000Z'),
      durationMs: 1000,
      candidates: 3,
      resolved: 1,
      pending: 1,
      providerErrors: 1,
      escalatedToManualReview: 0,
      expiredSwept: 0,
      outcome: 'succeeded' as const,
      error: null,
      details: { attemptCapEscalations: 0 },
    };

    const dto = ReconciliationRunResponseDto.fromEntity(run as any);

    expect(dto).toMatchObject({
      id: 'run-1',
      candidates: 3,
      resolved: 1,
      pending: 1,
      providerErrors: 1,
      outcome: 'succeeded',
      error: null,
      details: { attemptCapEscalations: 0 },
    });
    expect(dto.durationMs).toBe(1000);
    expect(dto.finishedAt).toBe(run.finishedAt);
  });
});
