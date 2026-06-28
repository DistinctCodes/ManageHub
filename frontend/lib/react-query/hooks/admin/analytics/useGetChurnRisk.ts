/**
 * useGetChurnRisk
 *
 * Fetches paginated at-risk member data from the churn risk API (BE-33).
 *
 * Location: frontend/lib/react-query/hooks/admin/analytics/useGetChurnRisk.ts
 */

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export interface ChurnRiskMember {
  id: string;
  name: string;
  email: string;
  lastBookingDate: string | null;
  daysSinceLastBooking: number;
  /** 0–100; drives the colour of the risk badge */
  riskScore: number;
}

export interface ChurnRiskResponse {
  members: ChurnRiskMember[];
  total: number;
  page: number;
  pageSize: number;
}

export interface UseGetChurnRiskParams {
  page?: number;
  pageSize?: number;
  /** Optionally filter by a minimum risk score */
  minRiskScore?: number;
}

async function fetchChurnRisk(
  params: UseGetChurnRiskParams
): Promise<ChurnRiskResponse> {
  const { page = 1, pageSize = 10, minRiskScore } = params;
  const { data } = await axios.get<ChurnRiskResponse>(
    "/api/admin/analytics/churn-risk",
    {
      params: {
        page,
        pageSize,
        ...(minRiskScore !== undefined && { minRiskScore }),
      },
    }
  );
  return data;
}

export function useGetChurnRisk(params: UseGetChurnRiskParams = {}) {
  return useQuery({
    queryKey: ["admin", "churn-risk", params],
    queryFn: () => fetchChurnRisk(params),
    staleTime: 5 * 60 * 1000, // 5 minutes — risk data doesn't change by the second
  });
}