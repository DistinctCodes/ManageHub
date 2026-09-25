export interface PaymentMetricsData {
  totalVolume: number;
  successfulTransactions: number;
  failedTransactions: number;
  dailyRevenue: Array<{ date: string; revenue: number; volume: number }>;
  statusDistribution: Array<{ status: string; count: number }>;
}

export const PAYMENT_METRICS_REFETCH_INTERVAL = 30_000;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getErrorMessage(body: unknown, status: number): string {
  if (isRecord(body) && typeof body.message === "string" && body.message.trim()) {
    return body.message;
  }
  return `Payment metrics request failed (${status})`;
}

export async function fetchPaymentMetrics(signal?: AbortSignal): Promise<PaymentMetricsData> {
  const response = await fetch("/payments/admin/metrics", {
    cache: "no-store",
    credentials: "same-origin",
    signal,
  });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getErrorMessage(body, response.status));
  }

  return body as PaymentMetricsData;
}
