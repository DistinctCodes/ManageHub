// lib/credits-api.ts  -- member-facing credit API (FE-108)

import { expireSession } from "@/lib/session-expiry";

import { getApiBaseUrl } from "@/lib/env";

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

export interface CreditsApiErrorBody {
  statusCode?: number;
  message?: string;
  requestId?: string;
  path?: string;
  timestamp?: string;
  code?: string;
  [key: string]: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export class CreditsApiError extends Error {
  readonly status: number;
  readonly statusCode: number;
  readonly code: string | null;
  readonly requestId: string | null;
  readonly responseBody: unknown;

  constructor(statusCode: number, responseBody: unknown) {
    const body = isRecord(responseBody) ? responseBody : null;
    const message =
      typeof body?.message === "string"
        ? body.message
        : `Request failed (${statusCode})`;

    super(message);
    this.name = "CreditsApiError";
    this.status = statusCode;
    this.statusCode = statusCode;
    this.code = typeof body?.code === "string" ? body.code : null;
    this.requestId =
      typeof body?.requestId === "string" ? body.requestId : null;
    this.responseBody = responseBody;
  }
}

async function creditsFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init?.headers,
    },
    // The API authorizes every credits call through the HttpOnly session
    // cookie (issue #1975); if it has been rejected, route the user to login
    // instead of leaving stale state around (issue #1977).
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401) {
      expireSession();
    }
    const body: unknown = await response.json().catch(() => null);
    throw new CreditsApiError(response.status, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

// -- member credit balance (FE-108) -----------------------------------------------

export function getCreditBalance(): Promise<CreditBalance> {
  return creditsFetch<CreditBalance>("/credits/balance");
}

export function getCreditStatement(
  page = 1,
  pageSize = 20,
): Promise<CreditStatement> {
  return creditsFetch<CreditStatement>(
    `/credits/statement?page=${page}&pageSize=${pageSize}`,
  );
}
