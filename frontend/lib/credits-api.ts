// lib/credits-api.ts  -- member-facing credit API (FE-108)

import { request } from "@/lib/http";

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

function creditsFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(path, {
    service: "credits",
    method: init?.method,
    body: init?.body,
    // Credits builds its own typed error and does not report to Sentry.
    makeError: (status, body) => new CreditsApiError(status, body),
    report: false,
  });
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
