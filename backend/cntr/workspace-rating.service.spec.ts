import { validateRating, computeAverageRating, WorkspaceRating } from './workspace-rating.service';

const rating = (overrides: Partial<WorkspaceRating> = {}): WorkspaceRating => ({
  workspaceId: 'ws-1',
  memberId: 'mem-1',
  bookingId: 'bk-1',
  score: 5,
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('validateRating', () => {
  it('does not throw for a valid score with no comment', () => {
    expect(() => validateRating(rating({ score: 3 }))).not.toThrow();
  });

  it('does not throw for a valid score with a comment under 500 chars', () => {
    expect(() => validateRating(rating({ score: 1, comment: 'Good' }))).not.toThrow();
  });

  it('throws RangeError for score 0', () => {
    expect(() => validateRating({ score: 0 as any })).toThrow(RangeError);
  });

  it('throws RangeError for score 6', () => {
    expect(() => validateRating({ score: 6 as any })).toThrow(RangeError);
  });

  it('throws RangeError for negative score', () => {
    expect(() => validateRating({ score: -1 as any })).toThrow(RangeError);
  });

  it('throws RangeError when score is undefined', () => {
    expect(() => validateRating({})).toThrow(RangeError);
  });

  it('throws Error when comment exceeds 500 characters', () => {
    const longComment = 'x'.repeat(501);
    expect(() => validateRating(rating({ comment: longComment }))).toThrow(Error);
  });

  it('does not throw for a comment exactly 500 characters', () => {
    const exactComment = 'x'.repeat(500);
    expect(() => validateRating(rating({ comment: exactComment }))).not.toThrow();
  });

  it('accepts all valid scores 1-5', () => {
    for (const score of [1, 2, 3, 4, 5] as const) {
      expect(() => validateRating(rating({ score }))).not.toThrow();
    }
  });
});

describe('computeAverageRating', () => {
  it('returns 0 for an empty array', () => {
    expect(computeAverageRating([])).toBe(0);
  });

  it('returns the score itself for a single rating', () => {
    expect(computeAverageRating([rating({ score: 4 })])).toBe(4);
  });

  it('computes the correct average rounded to 1 decimal', () => {
    const ratings = [
      rating({ score: 5 }),
      rating({ score: 4 }),
      rating({ score: 3 }),
    ];
    expect(computeAverageRating(ratings)).toBe(4);
  });

  it('rounds to 1 decimal place', () => {
    const ratings = [
      rating({ score: 5 }),
      rating({ score: 4 }),
    ];
    expect(computeAverageRating(ratings)).toBe(4.5);
  });

  it('handles a mix that produces a non-trivial decimal', () => {
    const ratings = [
      rating({ score: 5 }),
      rating({ score: 5 }),
      rating({ score: 4 }),
    ];
    expect(computeAverageRating(ratings)).toBe(4.7);
  });
});
