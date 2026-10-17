// Dry-run helper for retention.service.ts: previews what a retention pass
// would affect without deleting/archiving anything.
export interface DryRunResult {
  wouldAffect: number;
  sampleIds: string[];
}

/**
 * Builds a preview from a bounded sample of matching ids plus the
 * authoritative total. `totalCount` is passed separately because a dry run
 * over a large table must not load every matching id into memory just to
 * report the count.
 */
export function buildRetentionDryRunResult(
  sampleIds: string[],
  sampleSize = 10,
  totalCount = sampleIds.length,
): DryRunResult {
  return {
    wouldAffect: totalCount,
    sampleIds: sampleIds.slice(0, sampleSize),
  };
}

export function isDryRunRequested(query: Record<string, unknown>): boolean {
  return query.dryRun === 'true' || query.dryRun === true;
}
