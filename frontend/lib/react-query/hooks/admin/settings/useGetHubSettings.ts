import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export interface BusinessHour {
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

export interface HubSettings {
  name: string;
  address: string;
  city: string;
  country: string;
  contactEmail: string;
  contactPhone: string;
  leadTimeHours: number;
  maxDaysAhead: number;
  cancellationPolicyHours: number;
  businessHours: BusinessHour[];
  vatRatePercent: number;
  currency: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColorHex: string;
}

export const HUB_SETTINGS_QUERY_KEY = ['admin', 'hub-settings'] as const;

export function useGetHubSettings() {
  return useQuery<HubSettings, Error>({
    queryKey: HUB_SETTINGS_QUERY_KEY,
    queryFn: async () => {
      // apiClient directly returns HubSettings, no .data wrapper needed
      const response = await apiClient.get<HubSettings>('/hub-settings');
      return response;
    },
  });
}