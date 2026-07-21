import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api'; // Replace with your API client instance

export interface BusinessHour {
  day: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  isOpen: boolean;
  openTime: string; // "08:00"
  closeTime: string; // "17:00"
}

export interface HubSettings {
  // General
  name: string;
  address: string;
  city: string;
  country: string;
  contactEmail: string;
  contactPhone: string;
  // Booking Rules
  leadTimeHours: number;
  maxDaysAhead: number;
  cancellationPolicyHours: number;
  // Business Hours
  businessHours: BusinessHour[];
  // Financial
  vatRatePercent: number;
  currency: string; // e.g. "NGN"
  // Branding
  logoUrl?: string;
  faviconUrl?: string;
  primaryColorHex: string;
}

export const HUB_SETTINGS_QUERY_KEY = ['admin', 'hub-settings'];

export function useGetHubSettings() {
  return useQuery<HubSettings>({
    queryKey: HUB_SETTINGS_QUERY_KEY,
    queryFn: async () => {
      const response = await api.get('/hub-settings');
      return response.data;
    },
  });
}