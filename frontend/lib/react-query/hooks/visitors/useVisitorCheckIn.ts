import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

export interface Visitor {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  company?: string;
  hostName?: string;
  checkInTime?: string;
  checkOutTime?: string;
  status: 'EXPECTED' | 'CHECKED_IN' | 'CHECKED_OUT';
}

export interface CheckInPayload {
  fullName: string;
  email: string;
  phone: string;
  company?: string;
  hostName?: string;
}

// Member search for typeahead
export function useSearchMembers(query: string) {
  return useQuery({
    queryKey: ['members-search', query],
    queryFn: () => apiClient.get<Array<{ id: string; name: string }>>(`/members/search?q=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
  });
}

// Visitor check-in mutation
export function useVisitorCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CheckInPayload) =>
      apiClient.post<Visitor, CheckInPayload>('/visitors/check-in', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
    },
  });
}

// Visitor check-out mutation
export function useVisitorCheckOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (visitorId: string) =>
      apiClient.post<Visitor>(`/visitors/${visitorId}/check-out`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
    },
  });
}