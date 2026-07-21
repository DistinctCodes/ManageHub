import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface Visitor {
  id: string;
  fullName: string;
  hostName: string;
  hostId?: string;
  purpose: string;
  status: 'PENDING' | 'CHECKED_IN' | 'CHECKED_OUT';
  checkInTime?: string;
}

export interface Member {
  id: string;
  name: string;
  email?: string;
}

export interface CreateVisitorPayload {
  fullName: string;
  hostId: string;
  purpose: string;
}

// 1. Get Today's Expected / Checked-In Visitors
export function useGetTodayVisitors(search?: string) {
  return useQuery<Visitor[]>({
    queryKey: ['visitors', 'today', search],
    queryFn: async () => {
      const response = await api.get('/visitors', {
        params: { date: 'today', search },
      });
      return response.data;
    },
  });
}

// 2. Member Typeahead Search for Walk-ins
export function useSearchMembers(query: string) {
  return useQuery<Member[]>({
    queryKey: ['community', 'members', query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      const response = await api.get('/community/members', {
        params: { search: query },
      });
      return response.data;
    },
    enabled: query.length >= 2,
  });
}

// 3. Check-In Mutation
export function useVisitorCheckIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (visitorId: string) => {
      const response = await api.post(`/visitors/${visitorId}/check-in`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
    },
  });
}

// 4. Create & Check-In Walk-In Mutation
export function useCreateAndCheckInWalkIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateVisitorPayload) => {
      // Step A: Create Visitor
      const createRes = await api.post('/visitors', payload);
      const visitor = createRes.data;
      // Step B: Immediately Check In
      const checkInRes = await api.post(`/visitors/${visitor.id}/check-in`);
      return checkInRes.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
    },
  });
}

// 5. Check-Out Mutation
export function useVisitorCheckOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (visitorId: string) => {
      const response = await api.post(`/visitors/${visitorId}/check-out`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
    },
  });
}