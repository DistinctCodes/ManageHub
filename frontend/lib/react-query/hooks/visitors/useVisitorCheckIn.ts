import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Visitor {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  purpose: string;
  hostName: string;
  checkInTime?: string;
  checkOutTime?: string | null;
  status: 'PENDING' | 'CHECKED_IN' | 'CHECKED_OUT';
}

// Kept for any other file still importing the old name
export type VisitorLog = Visitor;

export interface Member {
  id: string;
  name: string;
  email?: string;
  phone?: string;
}

export interface WalkInPayload {
  fullName: string;
  hostId: string;
  purpose: string;
}

export const VISITORS_QUERY_KEY = ['visitors'];
export const TODAY_VISITORS_QUERY_KEY = ['visitors', 'today'];
export const MEMBERS_SEARCH_QUERY_KEY = ['members', 'search'];

export function useGetVisitors() {
  return useQuery<Visitor[]>({
    queryKey: VISITORS_QUERY_KEY,
    queryFn: async () => {
      const res = await fetch('/api/visitors');
      if (!res.ok) throw new Error('Failed to fetch visitor logs');
      return res.json();
    },
  });
}

// Kiosk polls today's visitor list (expected + checked-in)
export function useGetTodayVisitors() {
  return useQuery<Visitor[]>({
    queryKey: TODAY_VISITORS_QUERY_KEY,
    queryFn: async () => {
      const res = await fetch('/api/visitors/today');
      if (!res.ok) throw new Error("Failed to fetch today's visitors");
      return res.json();
    },
    refetchInterval: 30_000,
  });
}

// Typeahead search for host members in the walk-in flow
export function useSearchMembers(query: string) {
  return useQuery<Member[]>({
    queryKey: [...MEMBERS_SEARCH_QUERY_KEY, query],
    queryFn: async () => {
      const res = await fetch(`/api/members/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Failed to search members');
      return res.json();
    },
    enabled: query.trim().length > 0,
  });
}

// Checks in an existing/expected visitor by id
export function useCheckInVisitor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (visitorId: string) => {
      const res = await fetch(`/api/visitors/${visitorId}/check-in`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('Failed to check in visitor');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VISITORS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TODAY_VISITORS_QUERY_KEY });
    },
  });
}

// kiosk page imports this name instead of `useCheckInVisitor` — alias for compatibility
export const useVisitorCheckIn = useCheckInVisitor;

// Creates a walk-in visitor record AND checks them in immediately
export function useCreateAndCheckInWalkIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: WalkInPayload) => {
      const res = await fetch('/api/visitors/walk-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to create and check in walk-in visitor');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VISITORS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TODAY_VISITORS_QUERY_KEY });
    },
  });
}

export function useCheckOutVisitor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (visitorId: string) => {
      const res = await fetch(`/api/visitors/${visitorId}/check-out`, {
        method: 'PATCH',
      });
      if (!res.ok) throw new Error('Failed to check out visitor');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: VISITORS_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: TODAY_VISITORS_QUERY_KEY });
    },
  });
}

// kiosk page imports this name instead of `useCheckOutVisitor` — alias for compatibility
export const useVisitorCheckOut = useCheckOutVisitor;