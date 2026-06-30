import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export const useGlobalSearch = (query: string, types: string) => {
  return useQuery({
    queryKey: ['globalSearch', query, types],
    queryFn: async () => {
      const { data } = await apiClient.get('/search', {
        params: { q: query, types },
      });
      return data;
    },
    enabled: !!query,
  });
};