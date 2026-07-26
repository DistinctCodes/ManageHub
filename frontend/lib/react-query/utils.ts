import { QueryClient, QueryKey } from "@tanstack/react-query";

/**
 * Apply an optimistic update to a query cache entry.
 * Returns the previous data for potential rollback.
 */
export function optimisticUpdate<TData>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  updater: (old: TData | undefined) => TData
): TData | undefined {
  const previousData = queryClient.getQueryData<TData>(queryKey);

  queryClient.setQueryData<TData>(queryKey, (old) => updater(old));

  return previousData;
}

/**
 * Rollback a query cache entry to its previous state after a failed optimistic update.
 */
export function rollbackOnError<TData>(
  queryClient: QueryClient,
  queryKey: QueryKey,
  previousData: TData | undefined
): void {
  queryClient.setQueryData(queryKey, previousData);
}

/**
 * Invalidate and refetch queries matching the given key prefix.
 */
export function invalidateQueries(
  queryClient: QueryClient,
  queryKey: QueryKey
): void {
  queryClient.invalidateQueries({ queryKey });
}
