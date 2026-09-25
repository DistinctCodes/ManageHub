// Dry-run helper for retention.service.ts: previews what a retention pass
// would affect without deleting/archiving anything.
export interface DryRunResult {
  wouldAffect: number;
  sampleIds: string[];
}

export function buildRetentionDryRunResult(
  matchingIds: string[],
  sampleSize = 10,
): DryRunResult {
  return {
    wouldAffect: matchingIds.length,
    sampleIds: matchingIds.slice(0, sampleSize),
  };
}

export function isDryRunRequested(query: Record<string, unknown>): boolean {
  return query.dryRun === 'true' || query.dryRun === true;
}
