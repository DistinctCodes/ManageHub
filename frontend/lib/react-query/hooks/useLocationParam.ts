/**
 * useLocationParam
 *
 * Returns the currently selected location ID from the Zustand store.
 * Pass the returned object as `params` to any API call that needs location
 * filtering — it spreads a `locationId` key only when a location is selected.
 *
 * Usage:
 *   const locationParam = useLocationParam();
 *   const { data } = useQuery({
 *     queryKey: ['workspaces', locationParam],
 *     queryFn: () => axios.get('/api/workspaces', { params: locationParam }),
 *   });
 *
 * Location: frontend/lib/hooks/useLocationParam.ts
 */

import { useAuthStore } from "@/lib/store/authStore";

export function useLocationParam(): { locationId?: string } {
  const selectedLocationId = useAuthStore((s) => s.selectedLocationId);
  return selectedLocationId ? { locationId: selectedLocationId } : {};
}