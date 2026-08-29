"use client";

export type LedgerAccountKind =
  | "USER"
  | "TREASURY"
  | "REVENUE"
  | "PLATFORM_FEE"
  | "HUB_OPERATOR"
  | "REFERRAL";

export type SettlementBatchStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "SETTLED"
  | "PARTIALLY_SETTLED"
  | "FAILED"
  | "ABANDONED";

export type SettlementBatchMode = "DISTRIBUTION" | "NET_PAYABLE";

export interface LedgerAccount {
  id: string;
  kind: LedgerAccountKind;
  ownerId: string | null;
  currency: string;
  balance: number;
  overdraftLimit: number;
  externalPayoutAddress: string | null;
  frozen: boolean;
  label: string | null;
}

export interface CreateLedgerAccountInput {
  kind: LedgerAccountKind;
  ownerId?: string;
  currency?: string;
  overdraftLimit?: number;
  externalPayoutAddress?: string;
  label?: string;
}

export interface UpdateLedgerAccountInput {
  overdraftLimit?: number;
  externalPayoutAddress?: string;
  frozen?: boolean;
  label?: string;
}

export interface LedgerIntegrityReport {
  accountsChecked: number;
  balanceDrift: Array<{
    accountId: string;
    materialized: number;
    derived: number;
  }>;
  unbalancedTransactions: Array<{
    transactionId: string;
    debits: number;
    credits: number;
  }>;
}

export interface RevenueSplitRecipient {
  id: string;
  label: string;
  basisPoints: number;
  accountId: string | null;
  externalAddress: string | null;
  sortOrder: number;
}

export interface RevenueSplitConfig {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  recipients: RevenueSplitRecipient[];
  totalBasisPoints: number;
  createdAt: string;
}

export interface SplitRecipientInput {
  label: string;
  basisPoints: number;
  accountId?: string;
  externalAddress?: string;
  sortOrder?: number;
}

export interface SplitPreview {
  amount: number;
  allocatedTotal: number;
  shares: Array<{
    recipientId: string;
    label: string;
    basisPoints: number;
    amount: number;
    remainderUnits: number;
  }>;
}

export interface SettlementBatch {
  id: string;
  status: SettlementBatchStatus;
  currency: string;
  mode: SettlementBatchMode;
  splitConfigId: string | null;
  periodEnd: string;
  totalAmount: number;
  claimedEntryCount: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SettlementPayout {
  id: string;
  label: string;
  accountId: string | null;
  externalAddress: string | null;
  basisPoints: number | null;
  amount: number;
  currency: string;
  status: string;
  idempotencyKey: string;
  onChainReference: string | null;
  ledgerTransactionId: string | null;
  attempts: number;
  lastError: string | null;
  confirmedAt: string | null;
}

export interface LedgerEntry {
  id: string;
  transactionId: string;
  accountId: string;
  direction: string;
  amount: number;
  currency: string;
  settlementBatchId: string | null;
  settledAt: string | null;
  createdAt: string;
}

export interface SettlementBatchBreakdown {
  batch: SettlementBatch;
  payouts: SettlementPayout[];
  entries: LedgerEntry[];
  onChainReferences: Array<{ payoutId: string; reference: string }>;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

async function adminFetch<T>(
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
    const errorMessage = body?.message ?? `Admin request failed (${response.status})`;
    const error = new Error(errorMessage);
    
    Sentry.captureException(error, {
      tags: {
        api: "admin",
        endpoint: path,
        statusCode: response.status,
      },
      extra: {
        requestBody: init?.body,
        responseBody: body,
      },
    });
    
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

// ── ledger accounts (FE-111) ─────────────────────────────────────────────

export function listAccounts(
  accessToken: string,
  currency?: string,
): Promise<LedgerAccount[]> {
  const query = currency ? `?currency=${encodeURIComponent(currency)}` : "";
  return adminFetch<LedgerAccount[]>(`/credits/admin/accounts${query}`, accessToken);
}

export function createAccount(
  accessToken: string,
  input: CreateLedgerAccountInput,
): Promise<LedgerAccount> {
  return adminFetch<LedgerAccount>("/credits/admin/accounts", accessToken, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAccount(
  accessToken: string,
  id: string,
  input: UpdateLedgerAccountInput,
): Promise<LedgerAccount> {
  return adminFetch<LedgerAccount>(`/credits/admin/accounts/${id}`, accessToken, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

// ── ledger integrity (FE-112) ────────────────────────────────────────────

export function checkIntegrity(
  accessToken: string,
  currency?: string,
): Promise<LedgerIntegrityReport> {
  const query = currency ? `?currency=${encodeURIComponent(currency)}` : "";
  return adminFetch<LedgerIntegrityReport>(
    `/credits/admin/ledger/integrity${query}`,
    accessToken,
  );
}

// ── revenue splits (FE-113) ──────────────────────────────────────────────

export function listSplits(accessToken: string): Promise<RevenueSplitConfig[]> {
  return adminFetch<RevenueSplitConfig[]>("/credits/admin/splits", accessToken);
}

export function createSplit(
  accessToken: string,
  input: {
    name: string;
    description?: string;
    recipients: SplitRecipientInput[];
  },
): Promise<RevenueSplitConfig> {
  return adminFetch<RevenueSplitConfig>("/credits/admin/splits", accessToken, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function setSplitActive(
  accessToken: string,
  id: string,
  active: boolean,
): Promise<RevenueSplitConfig> {
  return adminFetch<RevenueSplitConfig>(
    `/credits/admin/splits/${id}/active`,
    accessToken,
    { method: "POST", body: JSON.stringify({ active }) },
  );
}

export function replaceSplitRecipients(
  accessToken: string,
  id: string,
  recipients: SplitRecipientInput[],
): Promise<RevenueSplitConfig> {
  return adminFetch<RevenueSplitConfig>(
    `/credits/admin/splits/${id}/recipients`,
    accessToken,
    { method: "PUT", body: JSON.stringify({ recipients }) },
  );
}

export function previewSplit(
  accessToken: string,
  configId: string,
  amount: number,
): Promise<SplitPreview> {
  return adminFetch<SplitPreview>("/credits/admin/splits/preview", accessToken, {
    method: "POST",
    body: JSON.stringify({ configId, amount }),
  });
}

// ── settlement (FE-114) ──────────────────────────────────────────────────

export function runSettlement(accessToken: string): Promise<unknown> {
  return adminFetch<unknown>("/credits/admin/settlement/run", accessToken, {
    method: "POST",
  });
}

export function listBatches(
  accessToken: string,
  status?: SettlementBatchStatus,
): Promise<SettlementBatch[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return adminFetch<SettlementBatch[]>(
    `/credits/admin/settlement/batches${query}`,
    accessToken,
  );
}

export function getBatchBreakdown(
  accessToken: string,
  id: string,
): Promise<SettlementBatchBreakdown> {
  return adminFetch<SettlementBatchBreakdown>(
    `/credits/admin/settlement/batches/${id}`,
    accessToken,
  );
}

export function executeBatch(
  accessToken: string,
  id: string,
): Promise<SettlementBatch> {
  return adminFetch<SettlementBatch>(
    `/credits/admin/settlement/batches/${id}/execute`,
    accessToken,
    { method: "POST" },
  );
}

export function retryBatch(
  accessToken: string,
  id: string,
): Promise<SettlementBatch> {
  return adminFetch<SettlementBatch>(
    `/credits/admin/settlement/batches/${id}/retry`,
    accessToken,
    { method: "POST" },
  );
}

export function abandonBatch(
  accessToken: string,
  id: string,
  reason: string,
): Promise<SettlementBatch> {
  return adminFetch<SettlementBatch>(
    `/credits/admin/settlement/batches/${id}/abandon`,
    accessToken,
    { method: "POST", body: JSON.stringify({ reason }) },
  );
}
