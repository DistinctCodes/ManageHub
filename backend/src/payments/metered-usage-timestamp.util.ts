// Timestamp source for metered-usage.service.ts that avoids Date.now()
// on the app server, so usage windows don't overlap or gap under clock
// skew across instances in a multi-instance deployment.
export interface DbClockSource {
  now(): Promise<Date>;
}

export async function getMeteredUsageTimestamp(
  dbClock: DbClockSource,
): Promise<Date> {
  return dbClock.now();
}

// Example DB-generated timestamp query for a Postgres-backed DbClockSource:
//   SELECT NOW() AS now
