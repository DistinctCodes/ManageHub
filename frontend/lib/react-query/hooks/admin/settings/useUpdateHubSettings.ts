import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { HUB_SETTINGS_QUERY_KEY, HubSettings } from './useGetHubSettings';

export type UpdateHubSettingsPayload = Partial<HubSettings>;

export function useUpdateHubSettings() {
  const queryClient = useQueryClient();

  return useMutation<HubSettings, Error, UpdateHubSettingsPayload>({
    mutationFn: async (payload: UpdateHubSettingsPayload) => {
      // apiClient directly returns HubSettings, no .data wrapper
      return await apiClient.patch<HubSettings>('/hub-settings', payload);
    },
    onSuccess: (data) => {
      queryClient.setQueryData<HubSettings>(HUB_SETTINGS_QUERY_KEY, (old) => {
        if (!old) return data;
        return { ...old, ...data };
      });
      queryClient.invalidateQueries({ queryKey: HUB_SETTINGS_QUERY_KEY });
    },
  });
}