import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';

export interface MembershipPlan {
  id: string;
  name: string;
  description: string;
  priceKobo: number;
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  features: string[];
  bookingHoursIncluded: number;
  guestPassesPerMonth: number;
  displayOrder: number;
  isActive: boolean;
  activeSubscribersCount: number;
}

export interface PlanFormPayload {
  name: string;
  description: string;
  priceNgn: number;
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';
  features: string[];
  bookingHoursIncluded: number;
  guestPassesPerMonth: number;
  displayOrder: number;
  isActive: boolean;
}

// 1. Fetch All Membership Plans (Admin or Public)
export function useGetMembershipPlans(includeInactive = false) {
  return useQuery<MembershipPlan[]>({
    queryKey: ['membership-plans', { includeInactive }],
    queryFn: async () => {
      const response = await api.get('/membership-plans', {
        params: { includeInactive },
      });
      return response.data;
    },
  });
}

// 2. Create Plan Mutation (Converts NGN to Kobo)
export function useCreatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: PlanFormPayload) => {
      const { priceNgn, ...rest } = payload;
      const body = {
        ...rest,
        priceKobo: Math.round(priceNgn * 100),
      };
      const response = await api.post('/membership-plans', body);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-plans'] });
    },
  });
}

// 3. Update Plan Mutation
export function useUpdatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<PlanFormPayload> }) => {
      const { priceNgn, ...rest } = payload;
      const body = {
        ...rest,
        ...(priceNgn !== undefined && { priceKobo: Math.round(priceNgn * 100) }),
      };
      const response = await api.patch(`/membership-plans/${id}`, body);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-plans'] });
    },
  });
}

// 4. Public Subscribe Mutation
export function useSubscribeToPlan() {
  return useMutation({
    mutationFn: async (planId: string) => {
      const response = await api.post(`/membership-plans/${planId}/subscribe`);
      return response.data;
    },
  });
}