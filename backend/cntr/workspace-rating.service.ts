export interface WorkspaceRating {
  workspaceId: string;
  memberId: string;
  bookingId: string;
  score: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  createdAt: string;
}

export function validateRating(rating: Partial<WorkspaceRating>): void {
  if (rating.score === undefined || rating.score < 1 || rating.score > 5) {
    throw new RangeError(`score must be between 1 and 5, got: ${rating.score}`);
  }
  if (rating.comment !== undefined && rating.comment.length > 500) {
    throw new Error(`comment must not exceed 500 characters`);
  }
}

export function computeAverageRating(ratings: WorkspaceRating[]): number {
  if (ratings.length === 0) return 0;
  const total = ratings.reduce((sum, r) => sum + r.score, 0);
  return Math.round((total / ratings.length) * 10) / 10;
}
