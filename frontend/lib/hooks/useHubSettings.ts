'use client';

import { useQuery } from '@tanstack/react-query';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export interface HubSettings {
  hubName: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  supportEmail?: string;
  supportPhone?: string;
  address?: string;
  socialLinks?: { twitter?: string; instagram?: string; linkedin?: string };
}

const DEFAULTS: HubSettings = {
  hubName: 'ManageHub',
  primaryColor: '#2563EB',
};

async function fetchHubSettings(): Promise<HubSettings> {
  const res = await fetch(`${BASE_URL}/hub-settings`);
  if (!res.ok) return DEFAULTS;
  return res.json();
}

/**
 * App-wide hook for hub branding settings.
 * Fetches once and caches for 10 minutes - public endpoint, no auth needed.
 * Apply primaryColor as a CSS variable:
 *   const { settings } = useHubSettings();
 *   document.documentElement.style.setProperty('--color-primary', settings.primaryColor);
 */
export function useHubSettings() {
  const { data, isLoading } = useQuery<HubSettings>({
    queryKey: ['hub-settings'],
    queryFn: fetchHubSettings,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    placeholderData: DEFAULTS,
  });

  return { settings: data ?? DEFAULTS, isLoading };
}
