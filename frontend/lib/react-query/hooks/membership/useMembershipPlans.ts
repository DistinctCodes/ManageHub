import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// --- TYPES ---

export type BillingCycle = 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

export interface MembershipPlan {
  id: string;
  name: string;
  description: string;
  priceKobo: number;
  billingCycle: BillingCycle;
  features: string[];
  bookingHoursIncluded: number;
  guestPassesPerMonth: number;
  displayOrder: number;
  isActive: boolean;
  activeSubscribersCount?: number; // Added to fix the TypeScript error
  createdAt?: string;
  updatedAt?: string;
}

export interface PlanFormPayload {
  name?: string;
  description?: string;
  priceNgn?: number;
  priceKobo?: number;
  billingCycle?: BillingCycle;
  features?: string[];
  bookingHoursIncluded?: number;
  guestPassesPerMonth?: number;
  displayOrder?: number;
  isActive?: boolean;
}

// --- QUERY & MUTATION HOOKS ---

export const MEMBERSHIP_PLANS_QUERY_KEY = ['membership-plans'];

export function useGetMembershipPlans(includeInactive: boolean = false) {
  return useQuery<MembershipPlan[]>({
    queryKey: [...MEMBERSHIP_PLANS_QUERY_KEY, { includeInactive }],
    queryFn: async () => {
      const res = await fetch(`/api/admin/membership-plans?includeInactive=${includeInactive}`);
      if (!res.ok) throw new Error('Failed to fetch membership plans');
      return res.json();
    },
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: PlanFormPayload) => {
      const res = await fetch('/api/admin/membership-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to create membership plan');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBERSHIP_PLANS_QUERY_KEY });
    },
  });
}

export function useUpdatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: PlanFormPayload }) => {
      const res = await fetch(`/api/admin/membership-plans/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to update membership plan');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBERSHIP_PLANS_QUERY_KEY });
    },
  });
}

export function useSubscribeToPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string) => {
      const res = await fetch(`/api/membership-plans/${planId}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Failed to subscribe to plan');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBERSHIP_PLANS_QUERY_KEY });
    },
  });
}