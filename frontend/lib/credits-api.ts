// lib/credits-api.ts  -- member-facing credit API (FE-108)

export interface CreditBalance {
  accountId: string;
  currency: string;
  balance: number;
  overdraftLimit: number;
}

export interface CreditStatementEntry {
  id: string;
  transactionId: string;
  direction: "DEBIT" | "CREDIT";
  amount: number;
  currency: string;
  description: string | null;
  kind: string;
  reference: string;
  createdAt: string;
}

export interface CreditStatement {
  entries: CreditStatementEntry[];
  total: number;
  page: number;
  pageSize: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

async function creditsFetch<T>(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...init?.headers,
    },
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message ?? `Request failed (${response.status})`);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

// -- member credit balance (FE-108) -----------------------------------------------

export function getCreditBalance(accessToken: string): Promise<CreditBalance> {
  return creditsFetch<CreditBalance>("/credits/balance", accessToken);
}

export function getCreditStatement(
  accessToken: string,
  page = 1,
  pageSize = 20,
): Promise<CreditStatement> {
  return creditsFetch<CreditStatement>(
    `/credits/statement?page=${page}&pageSize=${pageSize}`,
    accessToken,
  );
}
