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

export interface Member {
  id: string;
  name: string;
  email?: string;
}

export interface CheckInPayload {
  fullName: string;
  email: string;
  phone: string;
  company?: string;
  hostName?: string;
}

export interface WalkInPayload {
  fullName: string;
  email: string;
  phone: string;
  company?: string;
  hostName?: string;
  purpose?: string;
}

// 1. Fetch Today's Visitors
export function useGetTodayVisitors() {
  return useQuery({
    queryKey: ['visitors', 'today'],
    queryFn: () => apiClient.get<Visitor[]>('/visitors/today'),
  });
}

// 2. Member Typeahead Search
export function useSearchMembers(query: string) {
  return useQuery({
    queryKey: ['members-search', query],
    queryFn: () => apiClient.get<Member[]>(`/members/search?q=${encodeURIComponent(query)}`),
    enabled: query.length >= 2,
  });
}

// 3. Expected Visitor Check-In
export function useVisitorCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (visitorId: string) =>
      apiClient.post<Visitor>(`/visitors/${visitorId}/check-in`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
    },
  });
}

// 4. Create & Check-In Walk-In Visitor
export function useCreateAndCheckInWalkIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: WalkInPayload) =>
      apiClient.post<Visitor, WalkInPayload>('/visitors/walk-in', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
    },
  });
}

// 5. Visitor Check-Out
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