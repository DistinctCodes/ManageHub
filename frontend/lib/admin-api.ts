"use client";

import { request } from "@/lib/http";

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

function adminFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return request<T>(path, {
    service: "admin",
    method: init?.method,
    body: init?.body,
    fallbackMessage: (status) => `Admin request failed (${status})`,
  });
}

// ── ledger accounts (FE-111) ─────────────────────────────────────────────

export interface AdminListPage<T> {
  data: T[];
  nextCursor?: string | null;
  total?: number;
}

export function listAccounts(
  currency?: string,
  limit?: number,
  cursor?: string,
): Promise<AdminListPage<LedgerAccount> | LedgerAccount[]> {
  const params = new URLSearchParams();
  if (currency) params.set("currency", currency);
  if (typeof limit === "number") params.set("limit", String(limit));
  if (cursor) params.set("cursor", cursor);

  const query = params.toString() ? `?${params.toString()}` : "";
  return adminFetch<AdminListPage<LedgerAccount> | LedgerAccount[]>(
    `/credits/admin/accounts${query}`,
  );
}

export function createAccount(
  input: CreateLedgerAccountInput,
): Promise<LedgerAccount> {
  return adminFetch<LedgerAccount>("/credits/admin/accounts", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateAccount(
  id: string,
  input: UpdateLedgerAccountInput,
): Promise<LedgerAccount> {
  return adminFetch<LedgerAccount>(`/credits/admin/accounts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

// ── ledger integrity (FE-112) ────────────────────────────────────────────

export function checkIntegrity(
  currency?: string,
): Promise<LedgerIntegrityReport> {
  const query = currency ? `?currency=${encodeURIComponent(currency)}` : "";
  return adminFetch<LedgerIntegrityReport>(
    `/credits/admin/ledger/integrity${query}`,
  );
}

// ── revenue splits (FE-113) ──────────────────────────────────────────────

export function listSplits(): Promise<RevenueSplitConfig[]> {
  return adminFetch<RevenueSplitConfig[]>("/credits/admin/splits");
}

export function createSplit(
  input: {
    name: string;
    description?: string;
    recipients: SplitRecipientInput[];
  },
): Promise<RevenueSplitConfig> {
  return adminFetch<RevenueSplitConfig>("/credits/admin/splits", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function setSplitActive(
  id: string,
  active: boolean,
): Promise<RevenueSplitConfig> {
  return adminFetch<RevenueSplitConfig>(
    `/credits/admin/splits/${id}/active`,
    { method: "POST", body: JSON.stringify({ active }) },
  );
}

export function replaceSplitRecipients(
  id: string,
  recipients: SplitRecipientInput[],
): Promise<RevenueSplitConfig> {
  return adminFetch<RevenueSplitConfig>(
    `/credits/admin/splits/${id}/recipients`,
    { method: "PUT", body: JSON.stringify({ recipients }) },
  );
}

export function previewSplit(
  configId: string,
  amount: number,
): Promise<SplitPreview> {
  return adminFetch<SplitPreview>("/credits/admin/splits/preview", {
    method: "POST",
    body: JSON.stringify({ configId, amount }),
  });
}

// ── settlement (FE-114) ──────────────────────────────────────────────────

export function runSettlement(): Promise<unknown> {
  return adminFetch<unknown>("/credits/admin/settlement/run", {
    method: "POST",
  });
}

export function listBatches(
  status?: SettlementBatchStatus,
  limit?: number,
  cursor?: string,
): Promise<AdminListPage<SettlementBatch> | SettlementBatch[]> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (typeof limit === "number") params.set("limit", String(limit));
  if (cursor) params.set("cursor", cursor);

  const query = params.toString() ? `?${params.toString()}` : "";
  return adminFetch<AdminListPage<SettlementBatch> | SettlementBatch[]>(
    `/credits/admin/settlement/batches${query}`,
  );
}

export function getBatchBreakdown(
  id: string,
): Promise<SettlementBatchBreakdown> {
  return adminFetch<SettlementBatchBreakdown>(
    `/credits/admin/settlement/batches/${id}`,
  );
}

export function executeBatch(
  id: string,
): Promise<SettlementBatch> {
  return adminFetch<SettlementBatch>(
    `/credits/admin/settlement/batches/${id}/execute`,
    { method: "POST" },
  );
}

export function retryBatch(
  id: string,
): Promise<SettlementBatch> {
  return adminFetch<SettlementBatch>(
    `/credits/admin/settlement/batches/${id}/retry`,
    { method: "POST" },
  );
}

export function abandonBatch(
  id: string,
  reason: string,
): Promise<SettlementBatch> {
  return adminFetch<SettlementBatch>(
    `/credits/admin/settlement/batches/${id}/abandon`,
    { method: "POST", body: JSON.stringify({ reason }) },
  );
}
