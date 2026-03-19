export const memberKeys = {
  all: ['members'] as const,
  lists: () => [...memberKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...memberKeys.lists(), { ...filters }] as const,
  stats: () => [...memberKeys.all, 'stats'] as const,
};