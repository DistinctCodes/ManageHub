import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// --- TYPES ---

export type BillingCycle = "MONTHLY" | "QUARTERLY" | "YEARLY";

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
  activeSubscribersCount?: number;
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

export const MEMBERSHIP_PLANS_QUERY_KEY = ["membership-plans"];

export function useGetMembershipPlans(includeInactive: boolean = false) {
  return useQuery<MembershipPlan[]>({
    queryKey: [...MEMBERSHIP_PLANS_QUERY_KEY, { includeInactive }],
    queryFn: async () => {
      const res = await fetch(
        `/api/admin/membership-plans?includeInactive=${includeInactive}`
      );
      if (!res.ok) throw new Error("Failed to fetch membership plans");
      return res.json();
    },
  });
}

export function useCreatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: PlanFormPayload) => {
      const res = await fetch("/api/admin/membership-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to create membership plan");
      return res.json();
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({
        queryKey: MEMBERSHIP_PLANS_QUERY_KEY,
      });

      const previousPlans = queryClient.getQueriesData<MembershipPlan[]>({
        queryKey: MEMBERSHIP_PLANS_QUERY_KEY,
      });

      queryClient.setQueriesData<MembershipPlan[]>(
        { queryKey: MEMBERSHIP_PLANS_QUERY_KEY },
        (old) => {
          if (!old) return old;
          const optimisticPlan: MembershipPlan = {
            id: `temp-${Date.now()}`,
            name: payload.name || "",
            description: payload.description || "",
            priceKobo: payload.priceKobo || 0,
            billingCycle: payload.billingCycle || "MONTHLY",
            features: payload.features || [],
            bookingHoursIncluded: payload.bookingHoursIncluded || 0,
            guestPassesPerMonth: payload.guestPassesPerMonth || 0,
            displayOrder: payload.displayOrder || 0,
            isActive: payload.isActive ?? true,
          };
          return [...old, optimisticPlan];
        }
      );

      return { previousPlans };
    },
    onError: (_err, _payload, context) => {
      if (context?.previousPlans) {
        for (const [key, data] of context.previousPlans) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error("Failed to create membership plan");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBERSHIP_PLANS_QUERY_KEY });
      toast.success("Plan created successfully");
    },
  });
}

export function useUpdatePlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: PlanFormPayload;
    }) => {
      const res = await fetch(`/api/admin/membership-plans/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update membership plan");
      return res.json();
    },
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({
        queryKey: MEMBERSHIP_PLANS_QUERY_KEY,
      });

      const previousPlans = queryClient.getQueriesData<MembershipPlan[]>({
        queryKey: MEMBERSHIP_PLANS_QUERY_KEY,
      });

      queryClient.setQueriesData<MembershipPlan[]>(
        { queryKey: MEMBERSHIP_PLANS_QUERY_KEY },
        (old) => {
          if (!old) return old;
          return old.map((plan) =>
            plan.id === id ? { ...plan, ...payload } : plan
          );
        }
      );

      return { previousPlans };
    },
    onError: (_err, _data, context) => {
      if (context?.previousPlans) {
        for (const [key, data] of context.previousPlans) {
          queryClient.setQueryData(key, data);
        }
      }
      toast.error("Failed to update membership plan");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBERSHIP_PLANS_QUERY_KEY });
      toast.success("Plan updated successfully");
    },
  });
}

export function useSubscribeToPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planId: string) => {
      const res = await fetch(`/api/membership-plans/${planId}/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to subscribe to plan");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBERSHIP_PLANS_QUERY_KEY });
    },
  });
}
