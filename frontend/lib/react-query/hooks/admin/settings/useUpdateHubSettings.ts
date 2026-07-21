import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { HUB_SETTINGS_QUERY_KEY, HubSettings } from './useGetHubSettings';

export type UpdateHubSettingsPayload = Partial<HubSettings>;

export function useUpdateHubSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateHubSettingsPayload) => {
      const response = await api.patch('/hub-settings', payload);
      return response.data;
    },
    onSuccess: (data) => {
      // Optimistically update or invalidate query cache
      queryClient.setQueryData(HUB_SETTINGS_QUERY_KEY, (old: HubSettings | undefined) => ({
        ...old,
        ...data,
      }));
      queryClient.invalidateQueries({ queryKey: HUB_SETTINGS_QUERY_KEY });
    },
  });
}