import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';

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

// Fetch All Membership Plans
export function useGetMembershipPlans(includeInactive = false) {
  return useQuery<MembershipPlan[]>({
    queryKey: ['membership-plans', { includeInactive }],
    queryFn: () =>
      apiClient.get<MembershipPlan[]>(
        `/membership-plans${includeInactive ? '?includeInactive=true' : ''}`
      ),
  });
}

// Create Plan Mutation (Converts NGN to Kobo)
export function useCreatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PlanFormPayload) => {
      const { priceNgn, ...rest } = payload;
      const body = {
        ...rest,
        priceKobo: Math.round(priceNgn * 100),
      };
      return apiClient.post<MembershipPlan, typeof body>('/membership-plans', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-plans'] });
    },
  });
}

// Update Plan Mutation
export function useUpdatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<PlanFormPayload> }) => {
      const { priceNgn, ...rest } = payload;
      const body = {
        ...rest,
        ...(priceNgn !== undefined && { priceKobo: Math.round(priceNgn * 100) }),
      };
      return apiClient.patch<MembershipPlan, typeof body>(`/membership-plans/${id}`, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membership-plans'] });
    },
  });
}

// Public Subscribe Mutation
export function useSubscribeToPlan() {
  return useMutation({
    mutationFn: (planId: string) =>
      apiClient.post<{ checkoutUrl?: string }>(`/membership-plans/${planId}/subscribe`),
  });
}